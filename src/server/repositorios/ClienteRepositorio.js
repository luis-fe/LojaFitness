// Acesso à tabela "clientes" (chave: cep + nome).
import 'server-only'

export class ClienteRepositorio {
  constructor(banco) {
    this.banco = banco
  }

  // Cliente novo é criado; o mesmo CEP + nome tem o endereço atualizado e soma mais um pedido
  // db: conexão de uma transação (opcional)
  async salvar({ cep, nome, bairro, cidade, estado }, db) {
    const executar = db ? (sql, p) => db.query(sql, p) : (sql, p) => this.banco.consultar(sql, p)
    const { rows } = await executar(
      `INSERT INTO clientes (cep, nome, bairro, cidade, estado) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (cep, nome) DO UPDATE
         SET bairro = EXCLUDED.bairro, cidade = EXCLUDED.cidade, estado = EXCLUDED.estado,
             pedidos = clientes.pedidos + 1
       RETURNING cep, nome, bairro, cidade, estado, pedidos`,
      [cep, nome, bairro, cidade, estado]
    )
    return rows[0]
  }
}
