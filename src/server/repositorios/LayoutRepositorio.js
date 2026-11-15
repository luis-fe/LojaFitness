// Acesso à tabela "layout_paginas" (rascunho e publicado de cada página).
import 'server-only'

export class LayoutRepositorio {
  constructor(banco) {
    this.banco = banco
  }

  async buscarPublicado(pagina) {
    const { rows } = await this.banco.consultar('SELECT publicado FROM layout_paginas WHERE pagina = $1', [pagina])
    return rows[0]?.publicado ?? null
  }

  async buscarEditor(pagina) {
    const { rows } = await this.banco.consultar(
      `SELECT l.rascunho, l.publicado, l.atualizado_em, l.publicado_em,
              va.nome AS atualizado_por, vp.nome AS publicado_por
       FROM layout_paginas l
       LEFT JOIN vendedores va ON va.id = l.atualizado_por
       LEFT JOIN vendedores vp ON vp.id = l.publicado_por
       WHERE l.pagina = $1`,
      [pagina]
    )
    return rows[0] ?? null
  }

  // publicadoInicial: usado só quando a linha ainda não existe
  async salvarRascunho(pagina, camadas, publicadoInicial, autorId) {
    await this.banco.consultar(
      `INSERT INTO layout_paginas (pagina, rascunho, publicado, atualizado_por)
       VALUES ($1, $2::jsonb, $3::jsonb, $4)
       ON CONFLICT (pagina) DO UPDATE SET rascunho = EXCLUDED.rascunho, atualizado_por = EXCLUDED.atualizado_por`,
      [pagina, JSON.stringify(camadas), JSON.stringify(publicadoInicial), autorId]
    )
  }

  async publicar(pagina, camadas, autorId) {
    await this.banco.consultar(
      `INSERT INTO layout_paginas (pagina, rascunho, publicado, atualizado_por, publicado_por, publicado_em)
       VALUES ($1, $2::jsonb, $2::jsonb, $3, $3, now())
       ON CONFLICT (pagina) DO UPDATE
         SET rascunho = EXCLUDED.rascunho, publicado = EXCLUDED.publicado,
             atualizado_por = EXCLUDED.atualizado_por, publicado_por = EXCLUDED.publicado_por, publicado_em = now()`,
      [pagina, JSON.stringify(camadas), autorId]
    )
  }
}
