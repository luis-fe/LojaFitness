// Acesso às tabelas "pedidos", "pedido_itens" e "vendas_cor_tam".
import 'server-only'

export const SITUACAO = { RASCUNHO: 0, PAGO: 1 }
export const DIAS_RASCUNHO = 15 // rascunho mais antigo que isso é apagado automaticamente

export class PedidoRepositorio {
  constructor(banco, { clienteRepositorio }) {
    this.banco = banco
    this.clientes = clienteRepositorio
  }

  // Numa transação: grava/atualiza o cliente, cria o pedido como Rascunho (0), os itens e as
  // linhas de vendas_cor_tam.
  // itens: [{ codigoProduto, codigoCor, nome, cor, tamanho, quantidade, preco }]
  async criarRascunho({ cliente, itens, total }) {
    return this.banco.transacao(async (db) => {
      await this.clientes.salvar(cliente, db)
      const { rows } = await db.query(
        `INSERT INTO pedidos (situacao, cliente_cep, cliente_nome, total) VALUES ($1, $2, $3, $4)
         RETURNING id_pedido, codigo, data_emissao, situacao`,
        [SITUACAO.RASCUNHO, cliente.cep, cliente.nome, total]
      )
      const pedido = rows[0]
      for (const i of itens) {
        await db.query(
          `INSERT INTO pedido_itens (pedido_id, produto_filho_id, produto_nome, cor, tamanho, quantidade, preco_unitario)
           VALUES ($1,
                   (SELECT id FROM produtos_filho WHERE codigo_produto = $2 AND cor = $3 AND tamanho = $4),
                   $5, $6, $4, $7, $8)`,
          [pedido.id_pedido, i.codigoProduto, i.codigoCor, i.tamanho, i.nome, i.cor, i.quantidade, i.preco]
        )
        await db.query(
          `INSERT INTO vendas_cor_tam (id_pedido, codigo_produto, cor, tam, quant, preco) VALUES ($1, $2, $3, $4, $5, $6)`,
          [pedido.id_pedido, i.codigoProduto, i.codigoCor, i.tamanho, i.quantidade, i.preco]
        )
      }
      return pedido
    })
  }

  // Apaga pedidos em Rascunho há mais de N dias (pedido_itens e vendas_cor_tam saem junto: ON DELETE CASCADE).
  // Pedidos pagos (situação 1) nunca são apagados.
  async apagarRascunhosAntigos(dias = DIAS_RASCUNHO) {
    const { rowCount } = await this.banco.consultar(
      `DELETE FROM pedidos WHERE situacao = $1 AND data_emissao < now() - make_interval(days => $2)`,
      [SITUACAO.RASCUNHO, dias]
    )
    return rowCount
  }
}
