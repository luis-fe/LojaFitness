// Acesso às tabelas "pedidos" e "pedido_itens".
import 'server-only'

export const SITUACAO = { RASCUNHO: 0, PAGO: 1 }

export class PedidoRepositorio {
  constructor(banco, { clienteRepositorio }) {
    this.banco = banco
    this.clientes = clienteRepositorio
  }

  // Numa transação: grava/atualiza o cliente, cria o pedido como Rascunho (0) e os itens.
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
      }
      return pedido
    })
  }
}
