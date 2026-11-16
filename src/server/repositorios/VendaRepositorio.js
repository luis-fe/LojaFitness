// Registro de Vendas: pedidos em rascunho, extrato por SKU (vendas_cor_tam) e aprovação do pagamento.
import 'server-only'
import { SITUACAO } from '@/server/repositorios/PedidoRepositorio'

export class VendaRepositorio {
  constructor(banco) {
    this.banco = banco
  }

  async listarRascunhos() {
    const { rows } = await this.banco.consultar(
      `SELECT p.id_pedido, p.codigo, p.data_emissao, p.total, p.cliente_nome, p.cliente_cep,
              c.bairro, c.cidade, c.estado,
              COALESCE(sum(v.quant), 0)::int AS pecas, count(v.id)::int AS skus
       FROM pedidos p
       JOIN clientes c ON c.cep = p.cliente_cep AND c.nome = p.cliente_nome
       LEFT JOIN vendas_cor_tam v ON v.id_pedido = p.id_pedido
       WHERE p.situacao = $1
       GROUP BY p.id_pedido, c.bairro, c.cidade, c.estado
       ORDER BY p.data_emissao DESC`,
      [SITUACAO.RASCUNHO]
    )
    return rows
  }

  // Pedido + cliente + linhas por SKU (com nome do produto e da cor do cadastro, quando ainda existirem)
  async buscarExtrato(idPedido) {
    const { rows } = await this.banco.consultar(
      `SELECT p.id_pedido, p.codigo, p.data_emissao, p.situacao, p.total, p.aprovado_em,
              p.cliente_nome, p.cliente_cep, c.bairro, c.cidade, c.estado, va.nome AS aprovado_por
       FROM pedidos p
       JOIN clientes c ON c.cep = p.cliente_cep AND c.nome = p.cliente_nome
       LEFT JOIN vendedores va ON va.id = p.aprovado_por
       WHERE p.id_pedido = $1`,
      [idPedido]
    )
    if (!rows[0]) return null
    const linhas = await this.banco.consultar(
      `SELECT v.id, v.sku, v.codigo_produto, pr.nome AS produto_nome, v.cor, co.nome AS cor_nome, co.rgb,
              v.tam, v.quant, v.preco
       FROM vendas_cor_tam v
       LEFT JOIN produtos pr ON pr.codigo = v.codigo_produto
       LEFT JOIN cores co ON co.codigo = v.cor
       LEFT JOIN tamanhos t ON t.codigo = v.tam
       WHERE v.id_pedido = $1
       ORDER BY pr.nome NULLS LAST, co.nome NULLS LAST, t.sequencia NULLS LAST, v.id`,
      [idPedido]
    )
    return { ...rows[0], linhas: linhas.rows }
  }

  // Numa transação: aplica as edições do extrato (preço/quantidade), remove os SKUs excluídos,
  // recalcula o total, refaz pedido_itens e marca o pedido como Pago (1).
  // linhas: [{ id, quant, preco }] — SKUs que ficaram. Devolve false se o pedido não está em rascunho.
  async aprovar(idPedido, linhas, vendedorId) {
    return this.banco.transacao(async (db) => {
      const { rows } = await db.query('SELECT situacao FROM pedidos WHERE id_pedido = $1 FOR UPDATE', [idPedido])
      if (!rows[0]) return { ok: false, motivo: 'nao_encontrado' }
      if (rows[0].situacao !== SITUACAO.RASCUNHO) return { ok: false, motivo: 'ja_aprovado' }

      const ids = linhas.map((l) => l.id)
      const { rows: existentes } = await db.query('SELECT id FROM vendas_cor_tam WHERE id_pedido = $1', [idPedido])
      const doPedido = new Set(existentes.map((r) => String(r.id)))
      if (ids.some((id) => !doPedido.has(String(id)))) return { ok: false, motivo: 'linha_invalida' }

      await db.query('DELETE FROM vendas_cor_tam WHERE id_pedido = $1 AND NOT (id = ANY($2::bigint[]))', [idPedido, ids])
      for (const l of linhas) {
        await db.query('UPDATE vendas_cor_tam SET quant = $1, preco = $2 WHERE id = $3 AND id_pedido = $4', [l.quant, l.preco, l.id, idPedido])
      }

      // pedido_itens acompanha o extrato final
      await db.query('DELETE FROM pedido_itens WHERE pedido_id = $1', [idPedido])
      await db.query(
        `INSERT INTO pedido_itens (pedido_id, produto_filho_id, produto_nome, cor, tamanho, quantidade, preco_unitario)
         SELECT v.id_pedido, f.id, COALESCE(pr.nome, v.codigo_produto), COALESCE(co.nome, v.cor), v.tam, v.quant, v.preco
         FROM vendas_cor_tam v
         LEFT JOIN produtos pr ON pr.codigo = v.codigo_produto
         LEFT JOIN cores co ON co.codigo = v.cor
         LEFT JOIN produtos_filho f ON f.codigo_produto = v.codigo_produto AND f.cor = v.cor AND f.tamanho = v.tam
         WHERE v.id_pedido = $1`,
        [idPedido]
      )

      const { rows: atualizado } = await db.query(
        `UPDATE pedidos SET situacao = $2, aprovado_em = now(), aprovado_por = $3,
                total = (SELECT COALESCE(sum(quant * preco), 0) FROM vendas_cor_tam WHERE id_pedido = $1)
         WHERE id_pedido = $1
         RETURNING codigo, total`,
        [idPedido, SITUACAO.PAGO, vendedorId]
      )
      return { ok: true, pedido: atualizado[0] }
    })
  }

  // Exclui um pedido em Rascunho (vendas_cor_tam, pedido_itens e pagamentos saem junto: ON DELETE CASCADE).
  // Pedido pago não é excluído.
  async excluirRascunho(idPedido) {
    const { rowCount } = await this.banco.consultar('DELETE FROM pedidos WHERE id_pedido = $1 AND situacao = $2', [idPedido, SITUACAO.RASCUNHO])
    if (rowCount) return { ok: true }
    const { rows } = await this.banco.consultar('SELECT situacao FROM pedidos WHERE id_pedido = $1', [idPedido])
    return { ok: false, motivo: rows[0] ? 'ja_aprovado' : 'nao_encontrado' }
  }
}
