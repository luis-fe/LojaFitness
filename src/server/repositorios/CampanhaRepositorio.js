// Acesso à tabela "campanhas".
import 'server-only'

export class CampanhaRepositorio {
  constructor(banco) {
    this.banco = banco
  }

  async listar() {
    const { rows } = await this.banco.consultar(
      `SELECT id, nome, desconto_percentual, inicio, fim, ativa, (ativa AND now() BETWEEN inicio AND fim) AS vigente
       FROM campanhas ORDER BY inicio DESC`
    )
    return rows
  }
}
