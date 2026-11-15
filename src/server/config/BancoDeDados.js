// Conexão com o PostgreSQL.
//
// Uma única instância (banco) por processo, guardada em globalThis para não abrir
// conexões novas a cada recarga do `next dev`.
import 'server-only'
import pg from 'pg'

const { Pool, types } = pg

// O Postgres devolve NUMERIC (preços) e BIGINT (ids) como texto; convertemos para número.
types.setTypeParser(types.builtins.NUMERIC, (v) => (v === null ? null : parseFloat(v)))
types.setTypeParser(types.builtins.INT8, (v) => (v === null ? null : Number(v)))

export class BancoDeDados {
  #pool = null

  get configurado() {
    return Boolean(process.env.DATABASE_URL)
  }

  // DATABASE_SSL: 'false' (padrão, banco local) | 'true' (verifica o certificado) | 'no-verify'
  static #opcoesSsl() {
    switch ((process.env.DATABASE_SSL || 'false').toLowerCase()) {
      case 'true':
        return true
      case 'no-verify':
        return { rejectUnauthorized: false }
      default:
        return undefined
    }
  }

  get pool() {
    if (this.#pool) return this.#pool
    if (!this.configurado) {
      throw new Error('DATABASE_URL não configurada. Copie .env.example para .env.local e preencha.')
    }
    this.#pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: BancoDeDados.#opcoesSsl(),
      max: Number(process.env.DATABASE_POOL_MAX || 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })
    // Evita derrubar o servidor se uma conexão ociosa cair
    this.#pool.on('error', (erro) => console.error('[banco] erro em conexão ociosa:', erro.message))
    return this.#pool
  }

  // Consulta simples. SEMPRE passe valores em `parametros` ($1, $2...) — nunca concatene
  // texto do usuário no SQL (evita SQL injection).
  consultar(sql, parametros = []) {
    return this.pool.query(sql, parametros)
  }

  // Executa várias consultas em uma transação: ou tudo dá certo, ou nada é gravado.
  // A função recebe um cliente com o mesmo método .query().
  async transacao(funcao) {
    const cliente = await this.pool.connect()
    try {
      await cliente.query('BEGIN')
      const resultado = await funcao(cliente)
      await cliente.query('COMMIT')
      return resultado
    } catch (erro) {
      await cliente.query('ROLLBACK')
      throw erro
    } finally {
      cliente.release()
    }
  }
}

export const banco = (globalThis.__jlkBanco ??= new BancoDeDados())
