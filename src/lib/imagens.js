// Regras de negócio das imagens — somente no servidor.
//
//   • Aceita JPG, PNG e WEBP até IMAGEM_TAMANHO_MAX_MB (padrão 5 MB).
//   • O tipo é conferido pelo CONTEÚDO do arquivo (não pelo nome ou pelo que o navegador diz).
//   • Código único, normalizado: "conj calça azul" → "CONJ-CALCA-AZUL".
//   • Vendedor edita/exclui as imagens que enviou; admin, qualquer uma.
import 'server-only'
import sharp from 'sharp'
import { query } from '@/lib/db'
import { salvarArquivo, removerArquivo } from '@/lib/armazenamento'
import { ErroVendedor as ErroRegra } from '@/lib/vendedores'

export const TAMANHO_MAX_BYTES = Math.round(Number(process.env.IMAGEM_TAMANHO_MAX_MB || 5) * 1024 * 1024)

const FORMATOS = {
  jpeg: { mime: 'image/jpeg', extensao: 'jpg' },
  png: { mime: 'image/png', extensao: 'png' },
  webp: { mime: 'image/webp', extensao: 'webp' },
}

const CAMPOS = `i.id, i.codigo, i.descricao, i.arquivo, i.tipo_mime, i.tamanho_bytes, i.largura, i.altura,
                i.vendedor_id, v.nome AS vendedor_nome, i.criado_em, i.atualizado_em`

// Endereço público da imagem (servido por /arquivos/<nome>)
const comUrl = (linha) => ({ ...linha, url: `/arquivos/${linha.arquivo}` })

// "conj calça azul" → "CONJ-CALCA-AZUL"
export function normalizarCodigo(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9._-]/g, '')
    .replace(/-{2,}/g, '-')
}

function validarDados({ codigo, descricao }, { parcial = false } = {}) {
  const dados = {}
  const erros = {}
  if (!parcial || codigo !== undefined) {
    const c = normalizarCodigo(codigo)
    if (!/^[A-Z0-9][A-Z0-9._-]{1,59}$/.test(c)) erros.codigo = 'Use de 2 a 60 letras, números, ponto, hífen ou _.'
    else dados.codigo = c
  }
  if (!parcial || descricao !== undefined) {
    const d = String(descricao ?? '').trim()
    if (d.length < 2 || d.length > 200) erros.descricao = 'Informe a descrição (2 a 200 caracteres).'
    else dados.descricao = d
  }
  if (Object.keys(erros).length) throw new ErroRegra(422, 'Dados inválidos.', erros)
  return dados
}

function traduzirErroBanco(erro) {
  if (erro.code === '23505' && erro.constraint?.includes('codigo')) {
    throw new ErroRegra(409, 'Já existe uma imagem com este código.', { codigo: 'Já existe uma imagem com este código.' })
  }
  throw erro
}

// ---------------------------------------------------------------------------

export async function listarImagens({ busca = '', pagina = 1, porPagina = 24 } = {}) {
  pagina = Math.max(1, Number.parseInt(pagina, 10) || 1)
  porPagina = Math.min(100, Math.max(1, Number.parseInt(porPagina, 10) || 24))
  const params = []
  let where = ''
  if (busca.trim()) {
    params.push(`%${busca.trim()}%`)
    where = 'WHERE i.codigo ILIKE $1 OR i.descricao ILIKE $1'
  }
  params.push(porPagina, (pagina - 1) * porPagina)
  const { rows } = await query(
    `SELECT ${CAMPOS}, count(*) OVER()::int AS total_geral
     FROM imagens i LEFT JOIN vendedores v ON v.id = i.vendedor_id
     ${where}
     ORDER BY i.criado_em DESC, i.id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )
  const total = rows[0]?.total_geral ?? 0
  return {
    imagens: rows.map(({ total_geral, ...i }) => comUrl(i)),
    paginacao: { pagina, porPagina, total, totalPaginas: Math.ceil(total / porPagina) },
  }
}

export async function buscarImagem(id) {
  const { rows } = await query(
    `SELECT ${CAMPOS} FROM imagens i LEFT JOIN vendedores v ON v.id = i.vendedor_id WHERE i.id = $1`,
    [id]
  )
  if (!rows[0]) throw new ErroRegra(404, 'Imagem não encontrada.')
  return comUrl(rows[0])
}

export async function buscarPorArquivo(arquivo) {
  const { rows } = await query('SELECT tipo_mime FROM imagens WHERE arquivo = $1', [arquivo])
  return rows[0] ?? null
}

// Recebe o arquivo (File do FormData) + código e descrição
export async function criarImagem({ arquivo, codigo, descricao }, autor) {
  const dados = validarDados({ codigo, descricao })

  if (!arquivo || typeof arquivo.arrayBuffer !== 'function' || arquivo.size === 0) {
    throw new ErroRegra(422, 'Selecione uma imagem.', { arquivo: 'Selecione uma imagem.' })
  }
  if (arquivo.size > TAMANHO_MAX_BYTES) {
    const mb = (TAMANHO_MAX_BYTES / 1024 / 1024).toFixed(0)
    throw new ErroRegra(413, `A imagem passa do limite de ${mb} MB.`, { arquivo: `Tamanho máximo: ${mb} MB.` })
  }

  const conteudo = Buffer.from(await arquivo.arrayBuffer())

  // Abre a imagem de verdade: se não for JPG/PNG/WEBP válido, recusa
  let info
  try {
    info = await sharp(conteudo).metadata()
  } catch {
    info = null
  }
  const formato = FORMATOS[info?.format]
  if (!formato) {
    throw new ErroRegra(415, 'Formato não aceito. Envie JPG, PNG ou WEBP.', { arquivo: 'Envie JPG, PNG ou WEBP.' })
  }

  // Verifica o código antes de gravar o arquivo (evita arquivos órfãos)
  const { rows: existente } = await query('SELECT 1 FROM imagens WHERE codigo = $1', [dados.codigo])
  if (existente.length) traduzirErroBanco({ code: '23505', constraint: 'imagens_codigo_key' })

  const nome = await salvarArquivo(conteudo, formato.extensao)
  try {
    const { rows } = await query(
      `INSERT INTO imagens (codigo, descricao, arquivo, tipo_mime, tamanho_bytes, largura, altura, vendedor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [dados.codigo, dados.descricao, nome, formato.mime, conteudo.length, info.width ?? null, info.height ?? null, autor.id]
    )
    return buscarImagem(rows[0].id)
  } catch (erro) {
    await removerArquivo(nome) // não deixa arquivo sem registro
    traduzirErroBanco(erro)
  }
}

async function exigirDonoOuAdmin(id, autor) {
  const { rows } = await query('SELECT vendedor_id FROM imagens WHERE id = $1', [id])
  if (!rows[0]) throw new ErroRegra(404, 'Imagem não encontrada.')
  if (autor.papel !== 'admin' && rows[0].vendedor_id !== autor.id) {
    throw new ErroRegra(403, 'Você só pode alterar as imagens que enviou.')
  }
}

export async function atualizarImagem(id, entrada, autor) {
  const permitidos = ['codigo', 'descricao']
  const extras = Object.keys(entrada ?? {}).filter((c) => !permitidos.includes(c))
  if (extras.length) throw new ErroRegra(400, `Campos não permitidos: ${extras.join(', ')}.`)

  const dados = validarDados(entrada, { parcial: true })
  if (!Object.keys(dados).length) throw new ErroRegra(400, 'Nenhum campo para atualizar.')
  await exigirDonoOuAdmin(id, autor)

  const colunas = Object.keys(dados) // somente 'codigo' / 'descricao'
  try {
    await query(
      `UPDATE imagens SET ${colunas.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE id = $1`,
      [id, ...colunas.map((c) => dados[c])]
    )
  } catch (erro) {
    traduzirErroBanco(erro)
  }
  return buscarImagem(id)
}

export async function excluirImagem(id, autor) {
  await exigirDonoOuAdmin(id, autor)
  const { rows } = await query('DELETE FROM imagens WHERE id = $1 RETURNING arquivo', [id])
  if (rows[0]) await removerArquivo(rows[0].arquivo)
}
