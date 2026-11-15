// Layout da página inicial no banco — somente no servidor.
//
// Tabela layout_paginas: uma linha por página ('inicio'), com RASCUNHO (o que está sendo
// editado no construtor) e PUBLICADO (o que os clientes veem).
import 'server-only'
import { query } from '@/lib/db'
import { LAYOUT_PADRAO, validarLayout } from '@/lib/layoutModelos'
import { ErroVendedor as ErroRegra } from '@/lib/vendedores'

const PAGINA = 'inicio'

// Usado pela página inicial: se o banco falhar ou não houver layout, mostra o padrão
export async function obterLayoutPublicado() {
  try {
    const { rows } = await query('SELECT publicado FROM layout_paginas WHERE pagina = $1', [PAGINA])
    const validado = rows[0] && validarLayout(rows[0].publicado)
    return validado?.ok ? validado.camadas : LAYOUT_PADRAO
  } catch (erro) {
    console.error('[layout] usando layout padrão:', erro.message)
    return LAYOUT_PADRAO
  }
}

export async function obterLayoutEditor() {
  const { rows } = await query(
    `SELECT l.rascunho, l.publicado, l.atualizado_em, l.publicado_em,
            va.nome AS atualizado_por, vp.nome AS publicado_por
     FROM layout_paginas l
     LEFT JOIN vendedores va ON va.id = l.atualizado_por
     LEFT JOIN vendedores vp ON vp.id = l.publicado_por
     WHERE l.pagina = $1`,
    [PAGINA]
  )
  if (!rows[0]) {
    return { rascunho: LAYOUT_PADRAO, publicado: LAYOUT_PADRAO, atualizadoEm: null, publicadoEm: null, padrao: true }
  }
  const r = rows[0]
  return {
    rascunho: r.rascunho,
    publicado: r.publicado,
    atualizadoEm: r.atualizado_em,
    publicadoEm: r.publicado_em,
    atualizadoPor: r.atualizado_por,
    publicadoPor: r.publicado_por,
    padrao: false,
  }
}

function validarOuFalhar(camadas) {
  const v = validarLayout(camadas)
  if (!v.ok) throw new ErroRegra(422, v.erros[0], { camadas: v.erros })
  return v.camadas
}

export async function salvarRascunho(camadas, autor) {
  const validas = validarOuFalhar(camadas)
  await query(
    `INSERT INTO layout_paginas (pagina, rascunho, publicado, atualizado_por)
     VALUES ($1, $2::jsonb, $3::jsonb, $4)
     ON CONFLICT (pagina) DO UPDATE SET rascunho = EXCLUDED.rascunho, atualizado_por = EXCLUDED.atualizado_por`,
    [PAGINA, JSON.stringify(validas), JSON.stringify(LAYOUT_PADRAO), autor.id]
  )
  return obterLayoutEditor()
}

export async function publicar(camadas, autor) {
  const validas = validarOuFalhar(camadas)
  const json = JSON.stringify(validas)
  await query(
    `INSERT INTO layout_paginas (pagina, rascunho, publicado, atualizado_por, publicado_por, publicado_em)
     VALUES ($1, $2::jsonb, $2::jsonb, $3, $3, now())
     ON CONFLICT (pagina) DO UPDATE
       SET rascunho = EXCLUDED.rascunho, publicado = EXCLUDED.publicado,
           atualizado_por = EXCLUDED.atualizado_por, publicado_por = EXCLUDED.publicado_por, publicado_em = now()`,
    [PAGINA, json, autor.id]
  )
  return obterLayoutEditor()
}
