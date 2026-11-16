// Estoque: entradas (Produtos → Entradas) e consulta da movimentação (mov_produto).
import 'server-only'

export class EstoqueRepositorio {
  constructor(banco) {
    this.banco = banco
  }

  // Produtos com as variações e o estoque atual
  async listarProdutos() {
    const { rows } = await this.banco.consultar(
      `SELECT p.codigo, p.nome, p.ativo, p.caminho,
              COALESCE(json_agg(json_build_object('cor', f.cor, 'corNome', c.nome, 'rgb', c.rgb, 'tamanho', f.tamanho, 'estoque', f.estoque)
                       ORDER BY c.nome, t.sequencia) FILTER (WHERE f.id IS NOT NULL), '[]') AS variacoes
       FROM produtos p
       LEFT JOIN produtos_filho f ON f.codigo_produto = p.codigo
       LEFT JOIN cores c ON c.codigo = f.cor
       LEFT JOIN tamanhos t ON t.codigo = f.tamanho
       GROUP BY p.id
       ORDER BY p.nome`
    )
    return rows
  }

  // Numa transação: soma no estoque e grava a ENTRADA em mov_produto.
  // itens: [{ cor, tamanho, qtd }]. Devolve as variações que não existem (nada é gravado se houver).
  async registrarEntrada(codigo, itens, vendedorId) {
    return this.banco.transacao(async (db) => {
      const inexistentes = []
      for (const i of itens) {
        const { rows } = await db.query(
          'UPDATE produtos_filho SET estoque = estoque + $4 WHERE codigo_produto = $1 AND cor = $2 AND tamanho = $3 RETURNING estoque',
          [codigo, i.cor, i.tamanho, i.qtd]
        )
        if (!rows[0]) {
          inexistentes.push(`${codigo}-${i.cor}-${i.tamanho}`)
          continue
        }
        await db.query(
          `INSERT INTO mov_produto (codigo_produto, tam, cor, usuario, movimento, qtd) VALUES ($1, $2, $3, $4, 'entrada', $5)`,
          [codigo, i.tamanho, i.cor, vendedorId, i.qtd]
        )
      }
      if (inexistentes.length) throw Object.assign(new Error('variacao_inexistente'), { inexistentes })
      return true
    })
  }

  async movimentos(codigo, limite = 50) {
    const { rows } = await this.banco.consultar(
      `SELECT m.id, m.data_hora, m.movimento, m.qtd, m.tam, m.cor, c.nome AS cor_nome, v.nome AS usuario, p.codigo AS pedido
       FROM mov_produto m
       LEFT JOIN cores c ON c.codigo = m.cor
       LEFT JOIN vendedores v ON v.id = m.usuario
       LEFT JOIN pedidos p ON p.id_pedido = m.id_pedido
       WHERE m.codigo_produto = $1
       ORDER BY m.data_hora DESC, m.id DESC
       LIMIT $2`,
      [codigo, limite]
    )
    return rows
  }

  // Inventário: numa transação, para cada variação contada ajusta o estoque para a contagem e grava
  // em mov_produto o tipo 'inventario' com a diferença (positiva ou negativa).
  // contagens: [{ cor, tamanho, contado }]. Devolve [{ cor, tamanho, anterior, contado, diferenca }].
  async registrarInventario(codigo, contagens, vendedorId) {
    return this.banco.transacao(async (db) => {
      const resultado = []
      const inexistentes = []
      for (const c of contagens) {
        const { rows } = await db.query('SELECT estoque FROM produtos_filho WHERE codigo_produto = $1 AND cor = $2 AND tamanho = $3 FOR UPDATE', [codigo, c.cor, c.tamanho])
        if (!rows[0]) {
          inexistentes.push(`${codigo}-${c.cor}-${c.tamanho}`)
          continue
        }
        const anterior = rows[0].estoque
        const diferenca = c.contado - anterior
        if (diferenca !== 0) {
          await db.query('UPDATE produtos_filho SET estoque = $4 WHERE codigo_produto = $1 AND cor = $2 AND tamanho = $3', [codigo, c.cor, c.tamanho, c.contado])
          await db.query(
            `INSERT INTO mov_produto (codigo_produto, tam, cor, usuario, movimento, qtd) VALUES ($1, $2, $3, $4, 'inventario', $5)`,
            [codigo, c.tamanho, c.cor, vendedorId, diferenca]
          )
        }
        resultado.push({ cor: c.cor, tamanho: c.tamanho, anterior, contado: c.contado, diferenca })
      }
      if (inexistentes.length) throw Object.assign(new Error('variacao_inexistente'), { inexistentes })
      return resultado
    })
  }
}
