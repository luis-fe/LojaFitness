// Conexão com o PostgreSQL — use SOMENTE no servidor (API Routes / Server Components).
// O import 'server-only' faz o build falhar se alguém importar isto em um componente do navegador,
// protegendo a senha do banco.
import 'server-only'
import pg from 'pg'

const { Pool, types } = pg

// O Postgres devolve NUMERIC (preços) e BIGINT (ids) como texto; convertemos para número.
types.setTypeParser(types.builtins.NUMERIC, (v) => (v === null ? null : parseFloat(v)))
types.setTypeParser(types.builtins.INT8, (v) => (v === null ? null : Number(v)))

export const bancoConfigurado = () => Boolean(process.env.DATABASE_URL)

// DATABASE_SSL: 'false' (padrão, banco local) | 'true' (verifica o certificado) | 'no-verify'
function opcoesSsl() {
  switch ((process.env.DATABASE_SSL || 'false').toLowerCase()) {
    case 'true':
      return true
    case 'no-verify':
      return { rejectUnauthorized: false }
    default:
      return undefined
  }
}

function criarPool() {
  if (!bancoConfigurado()) {
    throw new Error('DATABASE_URL não configurada. Copie .env.example para .env.local e preencha.')
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: opcoesSsl(),
    max: Number(process.env.DATABASE_POOL_MAX || 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })

  // Evita derrubar o servidor se uma conexão ociosa cair
  pool.on('error', (erro) => console.error('[db] erro em conexão ociosa:', erro.message))
  return pool
}

// Uma única "piscina" de conexões por processo.
// Guardada em globalThis para não abrir conexões novas a cada recarga do `next dev`.
export function getPool() {
  if (!globalThis.__jlkPool) globalThis.__jlkPool = criarPool()
  return globalThis.__jlkPool
}

// Consulta simples. SEMPRE passe valores em `parametros` ($1, $2...) — nunca concatene
// texto do usuário no SQL (evita SQL injection).
//   const { rows } = await query('SELECT * FROM produtos WHERE slug = $1', [slug])
export function query(sql, parametros = []) {
  return getPool().query(sql, parametros)
}

// Executa várias consultas em uma transação: ou tudo dá certo, ou nada é gravado.
//   await transacao(async (db) => {
//     await db.query('UPDATE produtos_filho SET estoque = estoque - $1 WHERE id = $2', [2, 10])
//     await db.query('INSERT INTO pedidos (total) VALUES ($1)', [319.8])
//   })
export async function transacao(funcao) {
  const cliente = await getPool().connect()
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
