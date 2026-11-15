// Cadastros auxiliares do catálogo: TAMANHOS e CORES — somente no servidor.
//
//   • Códigos sempre em maiúsculas, sem acento (ex.: "verde militar" → VERDE-MILITAR).
//   • Cor guardada como #RRGGBB (aceita #RGB, #RRGGBB ou rgb(r, g, b) na entrada).
//   • Não é possível excluir uma cor/tamanho usado em alguma variação de produto.
//   • Mudar o código de uma cor/tamanho atualiza as variações automaticamente (ON UPDATE CASCADE).
import 'server-only'
import { query, transacao } from '@/lib/db'
import { ErroVendedor as ErroRegra } from '@/lib/vendedores'

const semAcento = (v) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export const normalizarCodigoCor = (v) =>
  semAcento(v)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)

const normalizarCodigoTamanho = (v) => semAcento(v).trim().toUpperCase().replace(/\s+/g, '')

// "#abc" | "#AABBCC" | "rgb(74, 127, 216)" → "#4A7FD8"; inválido → null
export function normalizarRgb(valor) {
  const v = String(valor ?? '').trim()
  let m = v.match(/^#?([0-9a-f]{6})$/i)
  if (m) return `#${m[1].toUpperCase()}`
  m = v.match(/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i)
  if (m) return `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}`.toUpperCase()
  m = v.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)
  if (m && m.slice(1).every((n) => Number(n) <= 255)) {
    return `#${m.slice(1).map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase()}`
  }
  return null
}

function falhar(erros) {
  if (Object.keys(erros).length) throw new ErroRegra(422, Object.values(erros)[0], erros)
}

function traduzir(erro, rotulo) {
  if (erro.code === '23505') {
    const campo = erro.constraint?.includes('nome') ? 'nome' : erro.constraint?.includes('sequencia') ? 'sequencia' : 'codigo'
    const msg = { codigo: `Já existe ${rotulo} com este código.`, nome: `Já existe ${rotulo} com este nome.`, sequencia: 'Já existe um tamanho nesta posição.' }[campo]
    throw new ErroRegra(409, msg, { [campo]: msg })
  }
  if (erro.code === '23503') {
    throw new ErroRegra(409, `Não é possível excluir: ${rotulo} está em uso em variações de produtos.`)
  }
  throw erro
}

async function emUso(coluna, codigo) {
  const { rows } = await query(`SELECT count(*)::int AS total FROM produtos_filho WHERE ${coluna} = $1`, [codigo])
  return rows[0].total
}

// ===========================================================================
// TAMANHOS
// ===========================================================================
const CAMPOS_TAMANHO = `t.codigo, t.nome, t.sequencia,
  (SELECT count(*)::int FROM produtos_filho f WHERE f.tamanho = t.codigo) AS em_uso`

export async function listarTamanhos() {
  const { rows } = await query(`SELECT ${CAMPOS_TAMANHO} FROM tamanhos t ORDER BY t.sequencia`)
  return rows
}

function validarTamanho(e, { parcial }) {
  const dados = {}
  const erros = {}
  if (!parcial || e.codigo !== undefined) {
    const c = normalizarCodigoTamanho(e.codigo)
    if (!/^[A-Z0-9]{1,6}$/.test(c)) erros.codigo = 'Código: até 6 letras ou números (ex.: P, GG, 38).'
    else dados.codigo = c
  }
  if (!parcial || e.nome !== undefined) {
    const n = String(e.nome ?? '').trim()
    if (n.length < 1 || n.length > 40) erros.nome = 'Informe o nome do tamanho (até 40 caracteres).'
    else dados.nome = n
  }
  if (e.sequencia !== undefined && e.sequencia !== null && e.sequencia !== '') {
    const s = Number(e.sequencia)
    if (!Number.isInteger(s) || s < 1 || s > 999) erros.sequencia = 'Sequência: número inteiro de 1 a 999.'
    else dados.sequencia = s
  }
  falhar(erros)
  return dados
}

export async function criarTamanho(entrada) {
  const d = validarTamanho(entrada ?? {}, { parcial: false })
  try {
    const { rows } = await query(
      `INSERT INTO tamanhos (codigo, nome, sequencia)
       VALUES ($1, $2, COALESCE($3, (SELECT COALESCE(max(sequencia), 0) + 1 FROM tamanhos)))
       RETURNING codigo`,
      [d.codigo, d.nome, d.sequencia ?? null]
    )
    return (await listarTamanhos()).find((t) => t.codigo === rows[0].codigo)
  } catch (erro) {
    traduzir(erro, 'um tamanho')
  }
}

export async function atualizarTamanho(codigoAtual, entrada) {
  const d = validarTamanho(entrada ?? {}, { parcial: true })
  if (!Object.keys(d).length) throw new ErroRegra(400, 'Nenhum campo para atualizar.')
  const colunas = Object.keys(d) // somente codigo / nome / sequencia (validados acima)
  try {
    const { rows } = await query(
      `UPDATE tamanhos SET ${colunas.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE codigo = $1 RETURNING codigo`,
      [codigoAtual, ...colunas.map((c) => d[c])]
    )
    if (!rows[0]) throw new ErroRegra(404, 'Tamanho não encontrado.')
    return (await listarTamanhos()).find((t) => t.codigo === rows[0].codigo)
  } catch (erro) {
    if (erro instanceof ErroRegra) throw erro
    traduzir(erro, 'um tamanho')
  }
}

// Reordena todos de uma vez: recebe a lista de códigos na nova ordem
export async function reordenarTamanhos(codigos) {
  if (!Array.isArray(codigos) || !codigos.length) throw new ErroRegra(400, 'Envie a lista de códigos na nova ordem.')
  const atuais = (await listarTamanhos()).map((t) => t.codigo)
  if (codigos.length !== atuais.length || !atuais.every((c) => codigos.includes(c))) {
    throw new ErroRegra(422, 'A lista deve conter todos os tamanhos, cada um uma vez.')
  }
  await transacao(async (db) => {
    // Primeiro posições temporárias negativas (evita conflito de "sequência repetida")
    await db.query('UPDATE tamanhos SET sequencia = -sequencia')
    for (const [i, codigo] of codigos.entries()) {
      await db.query('UPDATE tamanhos SET sequencia = $2 WHERE codigo = $1', [codigo, i + 1])
    }
  })
  return listarTamanhos()
}

export async function excluirTamanho(codigo) {
  const uso = await emUso('tamanho', codigo)
  if (uso) throw new ErroRegra(409, `Não é possível excluir: o tamanho ${codigo} está em ${uso} variação(ões) de produtos.`)
  const { rowCount } = await query('DELETE FROM tamanhos WHERE codigo = $1', [codigo])
  if (!rowCount) throw new ErroRegra(404, 'Tamanho não encontrado.')
}

// ===========================================================================
// CORES
// ===========================================================================
const CAMPOS_COR = `c.codigo, c.nome, c.rgb, c.criado_em, c.atualizado_em,
  (SELECT count(*)::int FROM produtos_filho f WHERE f.cor = c.codigo) AS em_uso`

export async function listarCores() {
  const { rows } = await query(`SELECT ${CAMPOS_COR} FROM cores c ORDER BY c.nome`)
  return rows
}

function validarCor(e, { parcial }) {
  const dados = {}
  const erros = {}
  if (!parcial || e.nome !== undefined) {
    const n = String(e.nome ?? '').trim()
    if (n.length < 1 || n.length > 40) erros.nome = 'Informe o nome da cor (até 40 caracteres).'
    else dados.nome = n
  }
  if (!parcial || e.codigo !== undefined) {
    // Sem código no cadastro: gera a partir do nome
    const c = normalizarCodigoCor(e.codigo || (!parcial ? e.nome : ''))
    if (!/^[A-Z0-9][A-Z0-9_-]{0,29}$/.test(c)) erros.codigo = 'Código: letras, números e hífen (ex.: VERDE-MILITAR).'
    else dados.codigo = c
  }
  if (!parcial || e.rgb !== undefined) {
    const r = normalizarRgb(e.rgb)
    if (!r) erros.rgb = 'Cor RGB inválida. Use #RRGGBB (ex.: #4A7FD8).'
    else dados.rgb = r
  }
  falhar(erros)
  return dados
}

export async function criarCor(entrada) {
  const d = validarCor(entrada ?? {}, { parcial: false })
  try {
    await query('INSERT INTO cores (codigo, nome, rgb) VALUES ($1, $2, $3)', [d.codigo, d.nome, d.rgb])
    return (await listarCores()).find((c) => c.codigo === d.codigo)
  } catch (erro) {
    traduzir(erro, 'uma cor')
  }
}

export async function atualizarCor(codigoAtual, entrada) {
  const d = validarCor(entrada ?? {}, { parcial: true })
  if (!Object.keys(d).length) throw new ErroRegra(400, 'Nenhum campo para atualizar.')
  const colunas = Object.keys(d) // somente codigo / nome / rgb (validados acima)
  try {
    const { rows } = await query(
      `UPDATE cores SET ${colunas.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE codigo = $1 RETURNING codigo`,
      [codigoAtual, ...colunas.map((c) => d[c])]
    )
    if (!rows[0]) throw new ErroRegra(404, 'Cor não encontrada.')
    return (await listarCores()).find((c) => c.codigo === rows[0].codigo)
  } catch (erro) {
    if (erro instanceof ErroRegra) throw erro
    traduzir(erro, 'uma cor')
  }
}

export async function excluirCor(codigo) {
  const uso = await emUso('cor', codigo)
  if (uso) throw new ErroRegra(409, `Não é possível excluir: a cor ${codigo} está em ${uso} variação(ões) de produtos.`)
  const { rowCount } = await query('DELETE FROM cores WHERE codigo = $1', [codigo])
  if (!rowCount) throw new ErroRegra(404, 'Cor não encontrada.')
}
