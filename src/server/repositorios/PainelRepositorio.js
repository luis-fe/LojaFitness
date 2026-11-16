// Indicadores do painel da Área do Vendedor e verificação de saúde do banco.
import 'server-only'

export class PainelRepositorio {
  constructor(banco) {
    this.banco = banco
  }

  // Indicadores do painel: produtos e variações em anúncio (produto ativo) e visitantes da última semana
  async resumo() {
    const { rows } = await this.banco.consultar(
      `SELECT
         (SELECT count(*)::int FROM produtos WHERE ativo) AS produtos_em_anuncio,
         (SELECT count(*)::int FROM produtos_filho f JOIN produtos p ON p.codigo = f.codigo_produto WHERE p.ativo) AS variacoes_em_anuncio,
         (SELECT count(*)::int FROM produtos_filho f JOIN produtos p ON p.codigo = f.codigo_produto WHERE p.ativo AND f.estoque > 0) AS variacoes_com_estoque,
         (SELECT count(DISTINCT ip)::int FROM visitantes_log WHERE data_hora > now() - interval '7 days') AS visitantes_semana,
         (SELECT count(*)::int FROM visitantes_log WHERE data_hora > now() - interval '7 days') AS visitas_semana`
    )
    const r = rows[0]
    return {
      produtosEmAnuncio: r.produtos_em_anuncio,
      variacoesEmAnuncio: r.variacoes_em_anuncio,
      variacoesComEstoque: r.variacoes_com_estoque,
      visitantesSemana: r.visitantes_semana,
      visitasSemana: r.visitas_semana,
    }
  }

  async saude() {
    const { rows } = await this.banco.consultar(
      `SELECT current_database() AS nome_banco,
              split_part(version(), ' ', 2) AS versao,
              (SELECT count(*) FROM produtos) AS produtos`
    )
    return rows[0]
  }
}
