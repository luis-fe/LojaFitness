// Acesso à tabela "cores".
import 'server-only'
import { ErroConflito } from '@/server/erros'

const CAMPOS = `c.codigo, c.nome, c.rgb, c.criado_em, c.atualizado_em,
  (SELECT count(*)::int FROM produtos_filho f WHERE f.cor = c.codigo) AS em_uso`

export class CorRepositorio {
  constructor(banco) {
    this.banco = banco
  }

  static traduzirErro(erro) {
    if (erro.code === '23505') {
      if (erro.constraint?.includes('nome')) throw new ErroConflito('Já existe uma cor com este nome.', { nome: 'Já existe uma cor com este nome.' })
      throw new ErroConflito('Já existe uma cor com este código.', { codigo: 'Já existe uma cor com este código.' })
    }
    throw erro
  }

  async listar() {
    const { rows } = await this.banco.consultar(`SELECT ${CAMPOS} FROM cores c ORDER BY c.nome`)
    return rows
  }

  async buscar(codigo) {
    const { rows } = await this.banco.consultar(`SELECT ${CAMPOS} FROM cores c WHERE c.codigo = $1`, [codigo])
    return rows[0] ?? null
  }

  async inserir({ codigo, nome, rgb }) {
    try {
      await this.banco.consultar('INSERT INTO cores (codigo, nome, rgb) VALUES ($1, $2, $3)', [codigo, nome, rgb])
    } catch (erro) {
      CorRepositorio.traduzirErro(erro)
    }
  }

  // colunas: somente codigo / nome / rgb (validadas no serviço). Devolve o código final ou null.
  async atualizar(codigoAtual, dados) {
    const colunas = Object.keys(dados)
    try {
      const { rows } = await this.banco.consultar(
        `UPDATE cores SET ${colunas.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE codigo = $1 RETURNING codigo`,
        [codigoAtual, ...colunas.map((c) => dados[c])]
      )
      return rows[0]?.codigo ?? null
    } catch (erro) {
      CorRepositorio.traduzirErro(erro)
    }
  }

  async contarUso(codigo) {
    const { rows } = await this.banco.consultar('SELECT count(*)::int AS total FROM produtos_filho WHERE cor = $1', [codigo])
    return rows[0].total
  }

  async excluir(codigo) {
    const { rowCount } = await this.banco.consultar('DELETE FROM cores WHERE codigo = $1', [codigo])
    return rowCount > 0
  }
}
