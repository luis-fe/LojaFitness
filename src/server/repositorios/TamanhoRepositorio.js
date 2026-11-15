// Acesso à tabela "tamanhos".
import 'server-only'
import { ErroConflito } from '@/server/erros'

const CAMPOS = `t.codigo, t.nome, t.sequencia,
  (SELECT count(*)::int FROM produtos_filho f WHERE f.tamanho = t.codigo) AS em_uso`

export class TamanhoRepositorio {
  constructor(banco) {
    this.banco = banco
  }

  static traduzirErro(erro) {
    if (erro.code === '23505') {
      if (erro.constraint?.includes('sequencia')) throw new ErroConflito('Já existe um tamanho nesta posição.', { sequencia: 'Já existe um tamanho nesta posição.' })
      throw new ErroConflito('Já existe um tamanho com este código.', { codigo: 'Já existe um tamanho com este código.' })
    }
    throw erro
  }

  async listar() {
    const { rows } = await this.banco.consultar(`SELECT ${CAMPOS} FROM tamanhos t ORDER BY t.sequencia`)
    return rows
  }

  async buscar(codigo) {
    const { rows } = await this.banco.consultar(`SELECT ${CAMPOS} FROM tamanhos t WHERE t.codigo = $1`, [codigo])
    return rows[0] ?? null
  }

  // sequencia vazia = vai para o fim
  async inserir({ codigo, nome, sequencia }) {
    try {
      await this.banco.consultar(
        `INSERT INTO tamanhos (codigo, nome, sequencia)
         VALUES ($1, $2, COALESCE($3, (SELECT COALESCE(max(sequencia), 0) + 1 FROM tamanhos)))`,
        [codigo, nome, sequencia ?? null]
      )
    } catch (erro) {
      TamanhoRepositorio.traduzirErro(erro)
    }
  }

  // colunas: somente codigo / nome / sequencia (validadas no serviço). Devolve o código final ou null.
  async atualizar(codigoAtual, dados) {
    const colunas = Object.keys(dados)
    try {
      const { rows } = await this.banco.consultar(
        `UPDATE tamanhos SET ${colunas.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE codigo = $1 RETURNING codigo`,
        [codigoAtual, ...colunas.map((c) => dados[c])]
      )
      return rows[0]?.codigo ?? null
    } catch (erro) {
      TamanhoRepositorio.traduzirErro(erro)
    }
  }

  async reordenar(codigos) {
    await this.banco.transacao(async (db) => {
      // posições temporárias negativas evitam conflito de "sequência repetida"
      await db.query('UPDATE tamanhos SET sequencia = -sequencia')
      for (const [i, codigo] of codigos.entries()) {
        await db.query('UPDATE tamanhos SET sequencia = $2 WHERE codigo = $1', [codigo, i + 1])
      }
    })
  }

  async contarUso(codigo) {
    const { rows } = await this.banco.consultar('SELECT count(*)::int AS total FROM produtos_filho WHERE tamanho = $1', [codigo])
    return rows[0].total
  }

  async excluir(codigo) {
    const { rowCount } = await this.banco.consultar('DELETE FROM tamanhos WHERE codigo = $1', [codigo])
    return rowCount > 0
  }
}
