// Cria (ou redefine a senha de) um usuário da Área do Vendedor.
//
//   npm run usuario:criar
//   npm run usuario:criar -- --usuario maria --nome "Maria Souza" --papel admin
//
// A senha é pedida no terminal (sem aparecer na tela) e salva só como hash.

import { fileURLToPath } from 'node:url'
import path from 'node:path'
import readline from 'node:readline'
import { parseArgs } from 'node:util'
import pg from 'pg'
import { gerarHashSenha, SENHA_MINIMA } from '../src/lib/senha.js'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
for (const arquivo of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(path.join(raiz, arquivo))
  } catch {
    /* arquivo não existe */
  }
}

const { values } = parseArgs({
  options: {
    usuario: { type: 'string' },
    nome: { type: 'string' },
    papel: { type: 'string', default: 'vendedor' },
    senha: { type: 'string' }, // só para automação; prefira digitar quando pedir
  },
})

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const perguntar = (texto) => new Promise((ok) => rl.question(texto, ok))

function perguntarOculto(texto) {
  return new Promise((ok) => {
    const escrever = rl._writeToOutput
    rl._writeToOutput = (s) => (s.includes(texto) ? escrever.call(rl, s) : escrever.call(rl, ''))
    rl.question(texto, (resposta) => {
      rl._writeToOutput = escrever
      process.stdout.write('\n')
      ok(resposta)
    })
  })
}

try {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não definida no .env.local.')

  const usuario = (values.usuario || (await perguntar('Usuário (login): '))).trim().toLowerCase()
  if (!/^[a-z0-9._-]{3,40}$/.test(usuario)) {
    throw new Error('Usuário inválido: use de 3 a 40 letras minúsculas, números, ponto, hífen ou _.')
  }
  const nome = (values.nome || (await perguntar('Nome: '))).trim()
  if (!nome) throw new Error('Informe o nome.')
  if (!['vendedor', 'admin'].includes(values.papel)) throw new Error('Papel deve ser "vendedor" ou "admin".')

  let senha = values.senha
  if (!senha) {
    senha = await perguntarOculto(`Senha (mínimo ${SENHA_MINIMA} caracteres): `)
    const confirmacao = await perguntarOculto('Confirme a senha: ')
    if (senha !== confirmacao) throw new Error('As senhas não conferem.')
  }
  if (senha.length < SENHA_MINIMA) throw new Error(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`)

  const ssl = { true: true, 'no-verify': { rejectUnauthorized: false } }[(process.env.DATABASE_SSL || '').toLowerCase()]
  const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl })
  await cliente.connect()
  const { rows } = await cliente.query(
    `INSERT INTO usuarios (usuario, nome, senha_hash, papel)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (usuario) DO UPDATE
       SET nome = EXCLUDED.nome, senha_hash = EXCLUDED.senha_hash, papel = EXCLUDED.papel, ativo = true
     RETURNING id, (xmax = 0) AS novo`,
    [usuario, nome, await gerarHashSenha(senha), values.papel]
  )
  await cliente.end()
  console.log(`✅ Usuário "${usuario}" ${rows[0].novo ? 'criado' : 'atualizado'} (id ${rows[0].id}, papel ${values.papel}).`)
} catch (erro) {
  console.error(`❌ ${erro.message}`)
  process.exitCode = 1
} finally {
  rl.close()
}
