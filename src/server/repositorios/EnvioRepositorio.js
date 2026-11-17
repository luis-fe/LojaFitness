// Acesso à tabela "envios" (etiqueta do Melhor Envio do pedido) e aos dados que a etiqueta precisa.
import 'server-only'

const CAMPOS = `id_pedido, servico_id, servico_nome, transportadora, valor, prazo_dias, situacao, dce,
  me_ids, me_protocolos, etiqueta_url, erro, gerada_em, atualizado_em`

export class EnvioRepositorio {
  constructor(banco) {
    this.banco = banco
  }

  async buscar(idPedido) {
    const { rows } = await this.banco.consultar(`SELECT ${CAMPOS} FROM envios WHERE id_pedido = $1`, [idPedido])
    return rows[0] ?? null
  }

  // Marca como "gerando" só se estiver pendente ou com erro: duas chamadas ao mesmo tempo não pagam 2 etiquetas
  async reservarGeracao(idPedido) {
    const { rows } = await this.banco.consultar(
      `UPDATE envios SET situacao = 'gerando', erro = NULL WHERE id_pedido = $1 AND situacao IN ('pendente', 'erro') RETURNING ${CAMPOS}`,
      [idPedido]
    )
    return rows[0] ?? null
  }

  async atualizar(idPedido, campos) {
    const nomes = Object.keys(campos)
    const { rows } = await this.banco.consultar(
      `UPDATE envios SET ${nomes.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE id_pedido = $1 RETURNING ${CAMPOS}`,
      [idPedido, ...nomes.map((c) => campos[c])]
    )
    return rows[0] ?? null
  }

  // Pedido + destinatário (cliente) + itens por SKU com as medidas do produto
  async dadosEtiqueta(idPedido) {
    const { rows } = await this.banco.consultar(
      `SELECT p.id_pedido, p.codigo, p.situacao, p.cliente_cep,
              c.nome, c.bairro, c.cidade, c.estado, c.logradouro, c.numero, c.complemento, c.cpf_cnpj, c.telefone, c.email
       FROM pedidos p
       JOIN clientes c ON c.cep = p.cliente_cep AND c.nome = p.cliente_nome
       WHERE p.id_pedido = $1`,
      [idPedido]
    )
    if (!rows[0]) return null
    const itens = await this.banco.consultar(
      `SELECT v.codigo_produto, pr.slug, pr.nome AS produto_nome, pr.calcula_frete, co.nome AS cor_nome, v.cor, v.tam, v.quant, v.preco
       FROM vendas_cor_tam v
       LEFT JOIN produtos pr ON pr.codigo = v.codigo_produto
       LEFT JOIN cores co ON co.codigo = v.cor
       WHERE v.id_pedido = $1
       ORDER BY v.id`,
      [idPedido]
    )
    return { ...rows[0], itens: itens.rows }
  }
}
