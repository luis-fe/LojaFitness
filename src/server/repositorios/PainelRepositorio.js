// Consultas de resumo para o painel da Área do Vendedor e verificação de saúde do banco.
import 'server-only'

export class PainelRepositorio {
  constructor(banco) {
    this.banco = banco
  }

  async resumo(estoqueBaixo) {
    const [produtos, baixo, pedidos] = await Promise.all([
      this.banco.consultar(
        `SELECT count(*) FILTER (WHERE ativo) AS ativos,
                (SELECT COALESCE(sum(estoque), 0) FROM produtos_filho) AS pecas
         FROM produtos`
      ),
      this.banco.consultar(
        `SELECT p.nome, c.nome AS cor, f.tamanho, f.estoque
         FROM produtos_filho f
         JOIN produtos p ON p.codigo = f.codigo_produto
         JOIN cores c ON c.codigo = f.cor
         WHERE p.ativo AND f.estoque <= $1
         ORDER BY f.estoque, p.nome, c.nome, f.tamanho`,
        [estoqueBaixo]
      ),
      this.banco.consultar(`SELECT count(*) FILTER (WHERE status = 'aguardando_pagamento') AS aguardando FROM pedidos`),
    ])
    return {
      produtosAtivos: produtos.rows[0].ativos,
      pecasDisponiveis: produtos.rows[0].pecas,
      pedidosAguardando: pedidos.rows[0].aguardando,
      estoqueBaixo: baixo.rows,
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
