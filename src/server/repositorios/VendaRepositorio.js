// Registro de Vendas: pedidos em rascunho, extrato por SKU (vendas_cor_tam) e aprovação do pagamento.
import 'server-only'
import { SITUACAO } from '@/server/repositorios/PedidoRepositorio'
import { ErroConflito } from '@/server/erros'

// Baixa o estoque das linhas (vendas_cor_tam) dentro da transação. Se faltar peça ou a variação não
// existir mais no cadastro, lança erro — a transação inteira é desfeita (nada é gravado).
async function baixarEstoque(db, linhas) {
  const faltas = []
  for (const l of linhas) {
    const { rows } = await db.query(
      `UPDATE produtos_filho SET estoque = estoque - $4
       WHERE codigo_produto = $1 AND cor = $2 AND tamanho = $3 AND estoque >= $4
       RETURNING estoque`,
      [l.codigo, l.cor, l.tamanho, l.quant]
    )
    if (rows[0]) continue
    const atual = await db.query('SELECT estoque FROM produtos_filho WHERE codigo_produto = $1 AND cor = $2 AND tamanho = $3', [l.codigo, l.cor, l.tamanho])
    const sku = `${l.codigo}-${l.cor}-${l.tamanho}`
    faltas.push(
      atual.rows[0]
        ? `${sku}: estoque insuficiente (pedido ${l.quant}, disponível ${atual.rows[0].estoque}).`
        : `${sku}: a variação não existe mais no cadastro — exclua este SKU.`
    )
  }
  if (faltas.length) {
    const e = new ErroConflito(`Sem estoque para concluir: ${faltas[0]}`)
    e.listaErros = faltas
    throw e
  }
}

export class VendaRepositorio {
  constructor(banco, { clienteRepositorio } = {}) {
    this.banco = banco
    this.clientes = clienteRepositorio
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
      `SELECT p.id_pedido, p.codigo, p.data_emissao, p.situacao, p.total, p.aprovado_em, p.origem,
              p.cliente_nome, p.cliente_cep, c.bairro, c.cidade, c.estado, c.cpf_cnpj, va.nome AS aprovado_por
       FROM pedidos p
       JOIN clientes c ON c.cep = p.cliente_cep AND c.nome = p.cliente_nome
       LEFT JOIN vendedores va ON va.id = p.aprovado_por
       WHERE p.id_pedido = $1`,
      [idPedido]
    )
    if (!rows[0]) return null
    const linhas = await this.banco.consultar(
      `SELECT v.id, v.sku, v.codigo_produto, pr.nome AS produto_nome, v.cor, co.nome AS cor_nome, co.rgb,
              v.tam, v.quant, v.preco, f.estoque
       FROM vendas_cor_tam v
       LEFT JOIN produtos pr ON pr.codigo = v.codigo_produto
       LEFT JOIN produtos_filho f ON f.codigo_produto = v.codigo_produto AND f.cor = v.cor AND f.tamanho = v.tam
       LEFT JOIN cores co ON co.codigo = v.cor
       LEFT JOIN tamanhos t ON t.codigo = v.tam
       WHERE v.id_pedido = $1
       ORDER BY pr.nome NULLS LAST, co.nome NULLS LAST, t.sequencia NULLS LAST, v.id`,
      [idPedido]
    )
    return { ...rows[0], linhas: linhas.rows }
  }

  // Numa transação: aplica as edições do extrato (preço/quantidade), remove os SKUs excluídos,
  // BAIXA O ESTOQUE, recalcula o total, refaz pedido_itens e marca o pedido como Pago (1).
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

      // baixa o estoque das linhas finais (sem estoque → erro e nada é gravado)
      const { rows: finais } = await db.query('SELECT codigo_produto AS codigo, cor, tam AS tamanho, quant FROM vendas_cor_tam WHERE id_pedido = $1', [idPedido])
      await baixarEstoque(db, finais)

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

  // Produtos do cadastro (inclusive ocultos na loja) com as variações, para o lançamento manual
  async listarProdutosParaVenda() {
    const { rows } = await this.banco.consultar(
      `SELECT p.codigo, p.nome, p.preco_atual, p.ativo,
              COALESCE(json_agg(json_build_object('cor', f.cor, 'corNome', c.nome, 'rgb', c.rgb, 'tamanho', f.tamanho, 'sequencia', t.sequencia, 'estoque', f.estoque)
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

  // Lançamento manual: numa transação baixa o estoque e grava o cliente, o pedido já Pago (1, origem manual), as
  // linhas de vendas_cor_tam e pedido_itens. itens: [{ codigo, cor, tamanho, quant, preco }]
  async criarManual({ cliente, itens, vendedorId }) {
    return this.banco.transacao(async (db) => {
      await baixarEstoque(db, itens) // sem estoque → erro e nada é gravado
      await this.clientes.salvar(cliente, db)
      const total = Math.round(itens.reduce((s, i) => s + i.quant * i.preco, 0) * 100) / 100
      const { rows } = await db.query(
        `INSERT INTO pedidos (situacao, origem, cliente_cep, cliente_nome, total, aprovado_em, aprovado_por)
         VALUES ($1, 'manual', $2, $3, $4, now(), $5)
         RETURNING id_pedido, codigo, total`,
        [SITUACAO.PAGO, cliente.cep, cliente.nome, total, vendedorId]
      )
      const pedido = rows[0]
      for (const i of itens) {
        await db.query(`INSERT INTO vendas_cor_tam (id_pedido, codigo_produto, cor, tam, quant, preco) VALUES ($1, $2, $3, $4, $5, $6)`, [
          pedido.id_pedido,
          i.codigo,
          i.cor,
          i.tamanho,
          i.quant,
          i.preco,
        ])
        await db.query(
          `INSERT INTO pedido_itens (pedido_id, produto_filho_id, produto_nome, cor, tamanho, quantidade, preco_unitario)
           SELECT $1, f.id, p.nome, COALESCE(c.nome, $3), $4, $5, $6
           FROM produtos p
           LEFT JOIN produtos_filho f ON f.codigo_produto = p.codigo AND f.cor = $3 AND f.tamanho = $4
           LEFT JOIN cores c ON c.codigo = $3
           WHERE p.codigo = $2`,
          [pedido.id_pedido, i.codigo, i.cor, i.tamanho, i.quant, i.preco]
        )
      }
      return pedido
    })
  }

  // Histórico: vendas pagas (situação 1), filtradas por período (data da venda = aprovação) e por cliente
  async historico({ de, ate, cliente }) {
    const filtros = ['p.situacao = $1']
    const valores = [SITUACAO.PAGO]
    if (de) {
      valores.push(de)
      filtros.push(`COALESCE(p.aprovado_em, p.data_emissao) >= $${valores.length}::date`)
    }
    if (ate) {
      valores.push(ate)
      filtros.push(`COALESCE(p.aprovado_em, p.data_emissao) < ($${valores.length}::date + 1)`)
    }
    if (cliente) {
      valores.push(`%${cliente}%`)
      const n = valores.length
      const digitos = cliente.replace(/\D/g, '')
      let doc = ''
      if (digitos.length >= 3) {
        valores.push(`%${digitos}%`)
        doc = ` OR c.cpf_cnpj LIKE $${valores.length} OR p.cliente_cep LIKE $${valores.length}`
      }
      filtros.push(`(p.cliente_nome ILIKE $${n}${doc})`)
    }
    const { rows } = await this.banco.consultar(
      `SELECT p.id_pedido, p.codigo, p.origem, p.total, p.data_emissao, COALESCE(p.aprovado_em, p.data_emissao) AS data_venda,
              p.cliente_nome, p.cliente_cep, c.cpf_cnpj, c.cidade, c.estado, va.nome AS aprovado_por,
              COALESCE(sum(v.quant), 0)::int AS pecas, count(v.id)::int AS skus
       FROM pedidos p
       JOIN clientes c ON c.cep = p.cliente_cep AND c.nome = p.cliente_nome
       LEFT JOIN vendedores va ON va.id = p.aprovado_por
       LEFT JOIN vendas_cor_tam v ON v.id_pedido = p.id_pedido
       WHERE ${filtros.join(' AND ')}
       GROUP BY p.id_pedido, c.cpf_cnpj, c.cidade, c.estado, va.nome
       ORDER BY data_venda DESC
       LIMIT 500`,
      valores
    )
    return rows
  }
}
