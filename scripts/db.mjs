// Executa os arquivos SQL da pasta db/ usando o DATABASE_URL do .env.local
//
//   npm run db:schema   → cria/atualiza as tabelas (db/schema.sql)
//   npm run db:seed     → carrega os produtos de exemplo (db/seed.sql)
//   npm run db:setup    → os dois em sequência

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import pg from 'pg'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

for (const arquivo of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(path.join(raiz, arquivo))
  } catch {
    /* arquivo não existe: tudo bem */
  }
}

const ARQUIVOS = { schema: ['schema.sql'], seed: ['seed.sql'], setup: ['schema.sql', 'seed.sql'] }
const comando = process.argv[2]

if (!ARQUIVOS[comando]) {
  console.error('Uso: node scripts/db.mjs <schema|seed|setup>')
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não definida. Copie .env.example para .env.local e preencha.')
  process.exit(1)
}

const ssl = { true: true, 'no-verify': { rejectUnauthorized: false } }[(process.env.DATABASE_SSL || '').toLowerCase()]
const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl })

try {
  await cliente.connect()
  for (const nome of ARQUIVOS[comando]) {
    const sql = await readFile(path.join(raiz, 'db', nome), 'utf8')
    await cliente.query(sql)
    console.log(`✅ db/${nome} executado`)
  }
} catch (erro) {
  console.error(`❌ Erro: ${erro.message}`)
  process.exitCode = 1
} finally {
  await cliente.end()
}
