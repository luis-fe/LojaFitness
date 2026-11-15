// Cria (ou atualiza) um vendedor direto no banco — útil para criar o PRIMEIRO administrador.
// Depois disso, o admin pode cadastrar os outros pela API (POST /api/vendedores).
//
//   npm run vendedor:criar
//   npm run vendedor:criar -- --papel admin
//   npm run vendedor:criar -- --login maria --nome "Maria Souza" --telefone 11987654321 \
//                             --cpf-cnpj 12345678909 --nome-fantasia "Maria Modas" --papel admin
//
// A senha é pedida no terminal (sem aparecer na tela) e salva só como hash.

import { fileURLToPath } from 'node:url'
import path from 'node:path'
import readline from 'node:readline'
import { parseArgs } from 'node:util'
import pg from 'pg'
import { gerarHashSenha } from '../src/server/utils/senha.js'
import { validarVendedor, SENHA_MINIMA } from '../src/server/utils/validacao.js'

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
    login: { type: 'string' },
    nome: { type: 'string' },
    telefone: { type: 'string' },
    'cpf-cnpj': { type: 'string' },
    'nome-fantasia': { type: 'string' },
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

  const entrada = {
    login: values.login ?? (await perguntar('Login: ')),
    nome: values.nome ?? (await perguntar('Nome: ')),
    telefone: values.telefone ?? (await perguntar('Telefone com DDD: ')),
    cpf_cnpj: values['cpf-cnpj'] ?? (await perguntar('CPF/CNPJ (opcional, Enter para pular): ')),
    nome_fantasia: values['nome-fantasia'] ?? (await perguntar('Nome fantasia (opcional, Enter para pular): ')),
    papel: values.papel,
  }

  let senha = values.senha
  if (!senha) {
    senha = await perguntarOculto(`Senha (mínimo ${SENHA_MINIMA} caracteres): `)
    const confirmacao = await perguntarOculto('Confirme a senha: ')
    if (senha !== confirmacao) throw new Error('As senhas não conferem.')
  }
  entrada.senha = senha

  const { dados, erros } = validarVendedor(entrada)
  if (Object.keys(erros).length) {
    throw new Error('Dados inválidos:\n' + Object.entries(erros).map(([c, m]) => `   • ${c}: ${m}`).join('\n'))
  }

  const ssl = { true: true, 'no-verify': { rejectUnauthorized: false } }[(process.env.DATABASE_SSL || '').toLowerCase()]
  const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl })
  await cliente.connect()
  try {
    const { rows } = await cliente.query(
      `INSERT INTO vendedores (login, nome, senha_hash, telefone, cpf_cnpj, nome_fantasia, papel)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (login) DO UPDATE
         SET nome = EXCLUDED.nome, senha_hash = EXCLUDED.senha_hash, telefone = EXCLUDED.telefone,
             cpf_cnpj = EXCLUDED.cpf_cnpj, nome_fantasia = EXCLUDED.nome_fantasia, papel = EXCLUDED.papel,
             ativo = true, senha_alterada_em = now()
       RETURNING id, (xmax = 0) AS novo`,
      [
        dados.login,
        dados.nome,
        await gerarHashSenha(dados.senha),
        dados.telefone,
        dados.cpf_cnpj ?? null,
        dados.nome_fantasia ?? null,
        dados.papel ?? 'vendedor',
      ]
    )
    console.log(
      `✅ Vendedor "${dados.login}" ${rows[0].novo ? 'criado' : 'atualizado'} (id ${rows[0].id}, papel ${dados.papel ?? 'vendedor'}).`
    )
  } catch (erro) {
    if (erro.code === '23505' && erro.constraint?.includes('cpf_cnpj')) throw new Error('CPF/CNPJ já cadastrado em outro vendedor.')
    throw erro
  } finally {
    await cliente.end()
  }
} catch (erro) {
  console.error(`❌ ${erro.message}`)
  process.exitCode = 1
} finally {
  rl.close()
}
