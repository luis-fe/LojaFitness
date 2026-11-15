// Executa os arquivos SQL da pasta db/ usando o DATABASE_URL (do ambiente ou do .env.local)
//
//   npm run db:schema   → cria/atualiza as tabelas (db/schema.sql)
//   npm run db:seed     → carrega os produtos de exemplo (db/seed.sql)
//   npm run db:setup    → os dois em sequência
//   npm run db:deploy   → usado no deploy (Railway roda antes de cada publicação):
//                         1. cria/atualiza as tabelas
//                         2. carrega os produtos de exemplo SOMENTE se não houver nenhum produto
//                         3. cria o primeiro administrador SOMENTE se não houver nenhum vendedor,
//                            usando ADMIN_LOGIN, ADMIN_NOME, ADMIN_TELEFONE e ADMIN_SENHA_INICIAL

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import pg from 'pg'
import { gerarHashSenha } from '../src/server/utils/senha.js'
import { validarVendedor } from '../src/server/utils/validacao.js'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

for (const arquivo of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(path.join(raiz, arquivo))
  } catch {
    /* arquivo não existe (normal no servidor): usa as variáveis do ambiente */
  }
}

const COMANDOS = ['schema', 'seed', 'setup', 'deploy']
const comando = process.argv[2]

if (!COMANDOS.includes(comando)) {
  console.error(`Uso: node scripts/db.mjs <${COMANDOS.join('|')}>`)
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não definida. Copie .env.example para .env.local e preencha.')
  process.exit(1)
}

const ssl = { true: true, 'no-verify': { rejectUnauthorized: false } }[(process.env.DATABASE_SSL || '').toLowerCase()]
const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl })

async function executar(nome) {
  const sql = await readFile(path.join(raiz, 'db', nome), 'utf8')
  await cliente.query(sql)
  console.log(`✅ db/${nome} executado`)
}

async function contar(tabela) {
  const { rows } = await cliente.query(`SELECT count(*)::int AS total FROM ${tabela}`)
  return rows[0].total
}

async function criarAdminInicial() {
  if ((await contar('vendedores')) > 0) {
    console.log('ℹ️  Já existem vendedores: administrador inicial não é necessário.')
    return
  }
  const { ADMIN_LOGIN, ADMIN_NOME, ADMIN_TELEFONE, ADMIN_SENHA_INICIAL } = process.env
  if (!ADMIN_LOGIN || !ADMIN_SENHA_INICIAL) {
    console.warn('⚠️  Nenhum vendedor cadastrado. Defina ADMIN_LOGIN e ADMIN_SENHA_INICIAL para criar o primeiro administrador.')
    return
  }
  const { dados, erros } = validarVendedor({
    login: ADMIN_LOGIN,
    nome: ADMIN_NOME || 'Administrador',
    telefone: ADMIN_TELEFONE,
    senha: ADMIN_SENHA_INICIAL,
    papel: 'admin',
  })
  if (Object.keys(erros).length) {
    console.warn('⚠️  Administrador inicial NÃO criado — variáveis ADMIN_* inválidas:')
    for (const [campo, msg] of Object.entries(erros)) console.warn(`    • ${campo}: ${msg}`)
    return
  }
  await cliente.query(
    `INSERT INTO vendedores (login, nome, senha_hash, telefone, papel) VALUES ($1, $2, $3, $4, 'admin')`,
    [dados.login, dados.nome, await gerarHashSenha(dados.senha), dados.telefone]
  )
  console.log(`✅ Administrador inicial "${dados.login}" criado. Troque a senha em Meu perfil.`)
}

try {
  await cliente.connect()

  if (comando === 'schema' || comando === 'setup' || comando === 'deploy') await executar('schema.sql')
  if (comando === 'seed' || comando === 'setup') await executar('seed.sql')

  if (comando === 'deploy') {
    if ((await contar('produtos')) === 0) await executar('seed.sql')
    else console.log('ℹ️  Já existem produtos: dados de exemplo não carregados.')
    await criarAdminInicial()
  }
} catch (erro) {
  console.error(`❌ Erro: ${erro.message}`)
  process.exitCode = 1
} finally {
  await cliente.end()
}
