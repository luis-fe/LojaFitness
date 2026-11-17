// Acesso à tabela "clientes" (chave: cep + nome).
import 'server-only'

export class ClienteRepositorio {
  constructor(banco) {
    this.banco = banco
  }

  // Cliente novo é criado; o mesmo CEP + nome tem o endereço atualizado e soma mais um pedido
  // db: conexão de uma transação (opcional)
  // entrega (opcional, compra com "Receber em casa"): { logradouro, numero, complemento, cpf, telefone, email }
  //   → atualiza o endereço completo, o CPF, o telefone e o e-mail do cliente; vazio mantém o que já havia
  async salvar({ cep, nome, bairro, cidade, estado, cpf_cnpj = null }, db, entrega = null) {
    const executar = db ? (sql, p) => db.query(sql, p) : (sql, p) => this.banco.consultar(sql, p)
    const e = entrega ?? {}
    const { rows } = await executar(
      `INSERT INTO clientes (cep, nome, bairro, cidade, estado, cpf_cnpj, logradouro, numero, complemento, telefone, email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (cep, nome) DO UPDATE
         SET bairro = EXCLUDED.bairro, cidade = EXCLUDED.cidade, estado = EXCLUDED.estado,
             cpf_cnpj = COALESCE(EXCLUDED.cpf_cnpj, clientes.cpf_cnpj),
             logradouro = COALESCE(EXCLUDED.logradouro, clientes.logradouro),
             numero = COALESCE(EXCLUDED.numero, clientes.numero),
             complemento = CASE WHEN EXCLUDED.logradouro IS NULL THEN clientes.complemento ELSE EXCLUDED.complemento END,
             telefone = COALESCE(EXCLUDED.telefone, clientes.telefone),
             email = COALESCE(EXCLUDED.email, clientes.email),
             pedidos = clientes.pedidos + 1
       RETURNING cep, nome, bairro, cidade, estado, cpf_cnpj, pedidos`,
      [cep, nome, bairro, cidade, estado, cpf_cnpj ?? (e.cpf || null), e.logradouro || null, e.numero || null, e.complemento || null, e.telefone || null, e.email || null]
    )
    return rows[0]
  }
}
