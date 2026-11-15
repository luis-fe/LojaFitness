// Cadastro de PRODUTOS (tabela produtos) e suas variações (produtos_filho) — somente no servidor.
//
//   • Código único em maiúsculas (ex.: CONJ-CALCA-AZUL); o endereço da página (slug) é gerado dele.
//   • preco_atual decimal com 2 casas; campanha opcional; caminho = imagem do volume (/arquivos/...) ou do site.
//   • As variações (cor x tamanho x estoque) são salvas junto com o produto, numa transação.
//   • criado_por = vendedor logado que cadastrou.
import 'server-only'
import { query, transacao } from '@/lib/db'
import { ErroVendedor as ErroRegra } from '@/lib/vendedores'

const CAMPOS = `p.id, p.codigo, p.slug, p.nome, p.descricao, p.preco_atual, p.ativo, p.caminho,
  p.campanha_id, c.nome AS campanha_nome, p.criado_em, p.criado_por, v.nome AS criado_por_nome, p.atualizado_em,
  (SELECT count(*)::int FROM produtos_filho f WHERE f.codigo_produto = p.codigo) AS variacoes,
  (SELECT COALESCE(sum(estoque), 0)::int FROM produtos_filho f WHERE f.codigo_produto = p.codigo) AS estoque_total`

const BASE = `FROM produtos p
  LEFT JOIN campanhas c ON c.id = p.campanha_id
  LEFT JOIN vendedores v ON v.id = p.criado_por`

const semAcento = (v) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export const normalizarCodigoProduto = (v) =>
  semAcento(v)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9._-]/g, '')
    .replace(/-{2,}/g, '-')

const slugDoCodigo = (codigo) => codigo.toLowerCase().replace(/[._]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '')

const caminhoValido = (u) =>
  /^\/arquivos\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(u) || /^\/images\/[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$/.test(u)

// "R$ 1.234,56" | "159,90" | 159.9 → 159.9
function lerPreco(v) {
  if (typeof v === 'number') return v
  let t = String(v ?? '').replace(/[R$\s]/g, '')
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  return t === '' ? NaN : Number(t)
}

function validarProduto(e, { parcial }) {
  const d = {}
  const erros = {}
  const veio = (c) => e[c] !== undefined

  if (!parcial || veio('codigo')) {
    const c = normalizarCodigoProduto(e.codigo)
    if (!/^[A-Z0-9][A-Z0-9._-]{1,59}$/.test(c)) erros.codigo = 'Código: de 2 a 60 letras, números, ponto, hífen ou _.'
    else d.codigo = c
  }
  if (!parcial || veio('nome')) {
    const n = String(e.nome ?? '').trim()
    if (n.length < 2 || n.length > 120) erros.nome = 'Informe o nome (2 a 120 caracteres).'
    else d.nome = n
  }
  if (!parcial || veio('descricao')) {
    const t = String(e.descricao ?? '').trim()
    if (t.length > 2000) erros.descricao = 'Descrição muito longa (máximo 2000 caracteres).'
    else d.descricao = t
  }
  if (!parcial || veio('preco_atual')) {
    const p = lerPreco(e.preco_atual)
    if (!Number.isFinite(p) || p < 0 || p > 99999999.99) erros.preco_atual = 'Informe um preço válido (ex.: 159,90).'
    else d.preco_atual = Math.round(p * 100) / 100
  }
  if (veio('campanha_id')) {
    if (e.campanha_id === null || e.campanha_id === '') d.campanha_id = null
    else if (!Number.isSafeInteger(Number(e.campanha_id)) || Number(e.campanha_id) < 1) erros.campanha_id = 'Campanha inválida.'
    else d.campanha_id = Number(e.campanha_id)
  }
  if (veio('caminho')) {
    if (!e.caminho) d.caminho = null
    else if (!caminhoValido(e.caminho)) erros.caminho = 'Escolha uma imagem enviada pelo site.'
    else d.caminho = e.caminho
  }
  if (veio('ativo')) {
    if (typeof e.ativo !== 'boolean') erros.ativo = 'Ativo deve ser verdadeiro ou falso.'
    else d.ativo = e.ativo
  }
  return { d, erros }
}

// Variações: [{ cor, tamanho, estoque }] — combinação cor+tamanho única
function validarFilhos(lista, erros) {
  if (lista === undefined) return undefined
  if (!Array.isArray(lista)) {
    erros.filhos = 'Variações inválidas.'
    return undefined
  }
  if (lista.length > 200) erros.filhos = 'No máximo 200 variações por produto.'
  const vistos = new Set()
  const saida = []
  lista.slice(0, 200).forEach((f, i) => {
    const cor = String(f?.cor ?? '').trim().toUpperCase()
    const tamanho = String(f?.tamanho ?? '').trim().toUpperCase()
    const estoque = Number(f?.estoque ?? 0)
    if (!cor || !tamanho) return void (erros.filhos = `Variação ${i + 1}: escolha a cor e o tamanho.`)
    if (!Number.isInteger(estoque) || estoque < 0 || estoque > 1000000) return void (erros.filhos = `Variação ${i + 1}: estoque deve ser um número inteiro a partir de 0.`)
    const chave = `${cor}|${tamanho}`
    if (vistos.has(chave)) return void (erros.filhos = `Variação repetida: ${cor} / ${tamanho}.`)
    vistos.add(chave)
    saida.push({ cor, tamanho, estoque })
  })
  return saida
}

function traduzir(erro) {
  if (erro instanceof ErroRegra) throw erro
  if (erro.code === '23505' && /codigo|slug/.test(erro.constraint ?? '')) {
    throw new ErroRegra(409, 'Já existe um produto com este código.', { codigo: 'Já existe um produto com este código.' })
  }
  if (erro.code === '23503') {
    if (erro.constraint?.includes('campanha')) throw new ErroRegra(422, 'Campanha não encontrada.', { campanha_id: 'Campanha não encontrada.' })
    if (erro.constraint?.includes('cor')) throw new ErroRegra(422, 'Uma das cores não está cadastrada.', { filhos: 'Uma das cores não está cadastrada.' })
    if (erro.constraint?.includes('tamanho')) throw new ErroRegra(422, 'Um dos tamanhos não está cadastrado.', { filhos: 'Um dos tamanhos não está cadastrado.' })
  }
  throw erro
}

async function gravarFilhos(db, codigo, filhos) {
  // Mantém os ids das variações que continuam (upsert) e remove as que saíram
  const chaves = filhos.map((f) => `${f.cor}|${f.tamanho}`)
  await db.query(`DELETE FROM produtos_filho WHERE codigo_produto = $1 AND NOT (cor || '|' || tamanho = ANY($2::text[]))`, [codigo, chaves])
  for (const f of filhos) {
    await db.query(
      `INSERT INTO produtos_filho (codigo_produto, cor, tamanho, estoque) VALUES ($1, $2, $3, $4)
       ON CONFLICT (codigo_produto, cor, tamanho) DO UPDATE SET estoque = EXCLUDED.estoque`,
      [codigo, f.cor, f.tamanho, f.estoque]
    )
  }
}

async function filhosDe(codigo) {
  const { rows } = await query(
    `SELECT f.id, f.cor, c.nome AS cor_nome, c.rgb, f.tamanho, t.nome AS tamanho_nome, t.sequencia, f.estoque
     FROM produtos_filho f
     JOIN cores c ON c.codigo = f.cor
     JOIN tamanhos t ON t.codigo = f.tamanho
     WHERE f.codigo_produto = $1
     ORDER BY c.nome, t.sequencia`,
    [codigo]
  )
  return rows
}

// ---------------------------------------------------------------------------

export async function listarProdutos() {
  const { rows } = await query(`SELECT ${CAMPOS} ${BASE} ORDER BY p.criado_em DESC, p.id DESC`)
  return rows
}

export async function buscarProduto(codigo) {
  const { rows } = await query(`SELECT ${CAMPOS} ${BASE} WHERE p.codigo = $1`, [codigo])
  if (!rows[0]) throw new ErroRegra(404, 'Produto não encontrado.')
  return { ...rows[0], filhos: await filhosDe(codigo) }
}

export async function criarProduto(entrada, autor) {
  const { d, erros } = validarProduto(entrada ?? {}, { parcial: false })
  const filhos = validarFilhos(entrada?.filhos ?? [], erros)
  if (Object.keys(erros).length) throw new ErroRegra(422, Object.values(erros)[0], erros)

  try {
    await transacao(async (db) => {
      await db.query(
        `INSERT INTO produtos (codigo, slug, nome, descricao, preco_atual, campanha_id, caminho, ativo, criado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, true), $9)`,
        [d.codigo, slugDoCodigo(d.codigo), d.nome, d.descricao, d.preco_atual, d.campanha_id ?? null, d.caminho ?? null, d.ativo ?? null, autor.id]
      )
      await gravarFilhos(db, d.codigo, filhos)
    })
  } catch (erro) {
    traduzir(erro)
  }
  return buscarProduto(d.codigo)
}

export async function atualizarProduto(codigoAtual, entrada, autor) {
  const { d, erros } = validarProduto(entrada ?? {}, { parcial: true })
  const filhos = validarFilhos(entrada?.filhos, erros)
  if (Object.keys(erros).length) throw new ErroRegra(422, Object.values(erros)[0], erros)
  if (!Object.keys(d).length && filhos === undefined) throw new ErroRegra(400, 'Nenhum campo para atualizar.')

  const codigoFinal = d.codigo ?? codigoAtual
  try {
    await transacao(async (db) => {
      const { rows } = await db.query('SELECT id FROM produtos WHERE codigo = $1 FOR UPDATE', [codigoAtual])
      if (!rows[0]) throw new ErroRegra(404, 'Produto não encontrado.')
      if (d.codigo) d.slug = slugDoCodigo(d.codigo)
      const colunas = Object.keys(d) // somente campos validados acima
      if (colunas.length) {
        await db.query(
          `UPDATE produtos SET ${colunas.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE codigo = $1`,
          [codigoAtual, ...colunas.map((c) => d[c])]
        )
      }
      // (as variações acompanham a troca de código automaticamente: ON UPDATE CASCADE)
      if (filhos !== undefined) await gravarFilhos(db, codigoFinal, filhos)
    })
  } catch (erro) {
    traduzir(erro)
  }
  return buscarProduto(codigoFinal)
}

export async function excluirProduto(codigo) {
  const { rowCount } = await query('DELETE FROM produtos WHERE codigo = $1', [codigo])
  if (!rowCount) throw new ErroRegra(404, 'Produto não encontrado.')
}

export async function listarCampanhas() {
  const { rows } = await query(
    `SELECT id, nome, desconto_percentual, inicio, fim, ativa, (ativa AND now() BETWEEN inicio AND fim) AS vigente
     FROM campanhas ORDER BY inicio DESC`
  )
  return rows
}
