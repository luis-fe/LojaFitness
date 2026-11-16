// Acesso às tabelas "produtos" (pai) e "produtos_filho" (variações).
import 'server-only'
import { ErroConflito, ErroValidacao } from '@/server/erros'

const CAMPOS = `p.id, p.codigo, p.slug, p.nome, p.descricao, p.preco_atual, p.preco_anterior, p.mostrar_preco_anterior, p.selo_campanha, p.ativo, p.caminho,
  p.campanha_id, c.nome AS campanha_nome, p.criado_em, p.criado_por, v.nome AS criado_por_nome, p.atualizado_em,
  (SELECT count(*)::int FROM produtos_filho f WHERE f.codigo_produto = p.codigo) AS variacoes,
  (SELECT COALESCE(sum(estoque), 0)::int FROM produtos_filho f WHERE f.codigo_produto = p.codigo) AS estoque_total`

const BASE = `FROM produtos p
  LEFT JOIN campanhas c ON c.id = p.campanha_id
  LEFT JOIN vendedores v ON v.id = p.criado_por`

export class ProdutoRepositorio {
  constructor(banco) {
    this.banco = banco
  }

  static traduzirErro(erro) {
    if (erro.code === '23505' && /codigo|slug/.test(erro.constraint ?? '')) {
      throw new ErroConflito('Já existe um produto com este código.', { codigo: 'Já existe um produto com este código.' })
    }
    if (erro.code === '23503') {
      if (erro.constraint?.includes('campanha')) throw new ErroValidacao({ campanha_id: 'Campanha não encontrada.' })
      if (erro.constraint?.includes('cor')) throw new ErroValidacao({ filhos: 'Uma das cores não está cadastrada.' })
      if (erro.constraint?.includes('tamanho')) throw new ErroValidacao({ filhos: 'Um dos tamanhos não está cadastrado.' })
    }
    throw erro
  }

  async listar() {
    const { rows } = await this.banco.consultar(`SELECT ${CAMPOS} ${BASE} ORDER BY p.criado_em DESC, p.id DESC`)
    return rows
  }

  async buscar(codigo) {
    const { rows } = await this.banco.consultar(`SELECT ${CAMPOS} ${BASE} WHERE p.codigo = $1`, [codigo])
    return rows[0] ?? null
  }

  async listarFilhos(codigo) {
    const { rows } = await this.banco.consultar(
      `SELECT f.id, f.cor, c.nome AS cor_nome, c.rgb, f.tamanho, t.nome AS tamanho_nome, t.sequencia, f.estoque
       FROM produtos_filho f
       JOIN cores c ON c.codigo = f.cor
       JOIN tamanhos t ON t.codigo = f.tamanho
       WHERE f.codigo_produto = $1
       ORDER BY c.nome, t.sequencia`,
      [codigo]
    )
    return rows
  }

  // Catálogo da loja: produtos visíveis (preço já com campanha vigente) e as variações que existem
  async listarCatalogo() {
    const [produtos, variacoes] = await Promise.all([
      this.banco.consultar(
        `SELECT codigo, slug, nome, descricao, caminho, preco_atual, preco_final, desconto_percentual, campanha_nome,
                preco_anterior, mostrar_preco_anterior, selo_campanha
         FROM produtos_com_preco WHERE ativo ORDER BY destaque DESC NULLS LAST, criado_em, id`
      ),
      this.banco.consultar(
        `SELECT f.codigo_produto, c.codigo AS cor, c.nome AS cor_nome, c.rgb, t.codigo AS tamanho, t.sequencia, f.estoque
         FROM produtos_filho f
         JOIN produtos p ON p.codigo = f.codigo_produto AND p.ativo
         JOIN cores c ON c.codigo = f.cor
         JOIN tamanhos t ON t.codigo = f.tamanho
         ORDER BY c.nome, t.sequencia`
      ),
    ])
    return { produtos: produtos.rows, variacoes: variacoes.rows }
  }

  // Salva produto + variações numa transação: ou grava tudo, ou nada.
  async criar(d, filhos) {
    try {
      await this.banco.transacao(async (db) => {
        await db.query(
          `INSERT INTO produtos (codigo, slug, nome, descricao, preco_atual, campanha_id, caminho, ativo, criado_por, preco_anterior, mostrar_preco_anterior, selo_campanha)
           VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, true), $9, $10, COALESCE($11, false), $12)`,
          [d.codigo, d.slug, d.nome, d.descricao, d.preco_atual, d.campanha_id ?? null, d.caminho ?? null, d.ativo ?? null, d.criado_por, d.preco_anterior ?? null, d.mostrar_preco_anterior ?? null, d.selo_campanha ?? null]
        )
        await ProdutoRepositorio.#gravarFilhos(db, d.codigo, filhos)
      })
    } catch (erro) {
      ProdutoRepositorio.traduzirErro(erro)
    }
  }

  // dados: colunas validadas no serviço; filhos === undefined mantém as variações
  // Devolve false se o produto não existe.
  async atualizar(codigoAtual, dados, filhos) {
    try {
      return await this.banco.transacao(async (db) => {
        const { rows } = await db.query('SELECT id FROM produtos WHERE codigo = $1 FOR UPDATE', [codigoAtual])
        if (!rows[0]) return false
        const colunas = Object.keys(dados)
        if (colunas.length) {
          await db.query(`UPDATE produtos SET ${colunas.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE codigo = $1`, [
            codigoAtual,
            ...colunas.map((c) => dados[c]),
          ])
        }
        // (as variações acompanham a troca de código automaticamente: ON UPDATE CASCADE)
        if (filhos !== undefined) await ProdutoRepositorio.#gravarFilhos(db, dados.codigo ?? codigoAtual, filhos)
        return true
      })
    } catch (erro) {
      ProdutoRepositorio.traduzirErro(erro)
    }
  }

  async excluir(codigo) {
    const { rowCount } = await this.banco.consultar('DELETE FROM produtos WHERE codigo = $1', [codigo])
    return rowCount > 0
  }

  // Mantém os ids das variações que continuam (upsert) e remove as que saíram
  static async #gravarFilhos(db, codigo, filhos) {
    const chaves = filhos.map((f) => `${f.cor}|${f.tamanho}`)
    await db.query(`DELETE FROM produtos_filho WHERE codigo_produto = $1 AND NOT (cor || '|' || tamanho = ANY($2::text[]))`, [codigo, chaves])
    for (const f of filhos) {
      await db.query(
        `INSERT INTO produtos_filho (codigo_produto, cor, tamanho, estoque) VALUES ($1, $2, $3, $4)
         ON CONFLICT (codigo_produto, cor, tamanho) DO UPDATE SET estoque = EXCLUDED.estoque`,
        [codigo, f.cor, f.tamanho, f.estoque]
      )
    }
  }
}
