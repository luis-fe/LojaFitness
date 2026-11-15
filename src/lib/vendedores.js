// Regras de negócio da tabela "vendedores" — somente no servidor.
//
// Todas as APIs de vendedor passam por aqui. Regras principais:
//   • Senha sempre criptografada (scrypt); senha_hash NUNCA sai nas respostas.
//   • Login e CPF/CNPJ únicos; telefone e documento guardados só com dígitos.
//   • Vendedor não é apagado: é desativado (preserva o histórico de pedidos).
//   • Sempre deve existir pelo menos 1 administrador ativo.
//   • Trocar a senha ou desativar invalida os tokens já emitidos.
import 'server-only'
import { query, transacao } from '@/lib/db'
import { gerarHashSenha, conferirSenha } from '@/lib/senha'
import { validarVendedor, validarSenha } from '@/lib/validacao'

// Colunas públicas (sem senha_hash)
const CAMPOS = `id, login, nome, telefone, cpf_cnpj, tipo_documento, nome_fantasia,
                papel, ativo, ultimo_login_em, criado_em, atualizado_em`

// Erro de regra de negócio, já com o status HTTP adequado
export class ErroVendedor extends Error {
  constructor(status, mensagem, campos) {
    super(mensagem)
    this.status = status
    this.campos = campos
  }
}

function lancarSeInvalido(erros) {
  if (Object.keys(erros).length) throw new ErroVendedor(422, 'Dados inválidos.', erros)
}

// Traduz violações de unicidade do Postgres em mensagens amigáveis
function traduzirErroBanco(erro) {
  if (erro.code === '23505') {
    if (erro.constraint?.includes('login')) {
      throw new ErroVendedor(409, 'Este login já está em uso.', { login: 'Este login já está em uso.' })
    }
    if (erro.constraint?.includes('cpf_cnpj')) {
      throw new ErroVendedor(409, 'CPF/CNPJ já cadastrado.', { cpf_cnpj: 'CPF/CNPJ já cadastrado.' })
    }
  }
  throw erro
}

async function contarAdminsAtivos(db, excetoId) {
  const { rows } = await db.query(
    `SELECT count(*)::int AS total FROM vendedores WHERE papel = 'admin' AND ativo AND id <> $1`,
    [excetoId ?? 0]
  )
  return rows[0].total
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

// Lista com busca e paginação. filtros: { busca, ativo, pagina, porPagina }
export async function listarVendedores({ busca = '', ativo, pagina = 1, porPagina = 20 } = {}) {
  pagina = Math.max(1, Number.parseInt(pagina, 10) || 1)
  porPagina = Math.min(100, Math.max(1, Number.parseInt(porPagina, 10) || 20))

  const condicoes = []
  const params = []
  const proximo = (valor) => {
    params.push(valor)
    return `$${params.length}`
  }

  if (busca.trim()) {
    const termo = proximo(`%${busca.trim()}%`)
    const alternativas = [`nome ILIKE ${termo}`, `login ILIKE ${termo}`, `nome_fantasia ILIKE ${termo}`]
    const digitos = busca.replace(/\D/g, '')
    if (digitos.length >= 3) {
      const numero = proximo(`%${digitos}%`)
      alternativas.push(`telefone LIKE ${numero}`, `cpf_cnpj LIKE ${numero}`)
    }
    condicoes.push(`(${alternativas.join(' OR ')})`)
  }
  if (typeof ativo === 'boolean') condicoes.push(`ativo = ${proximo(ativo)}`)

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''
  const limite = proximo(porPagina)
  const deslocamento = proximo((pagina - 1) * porPagina)

  const { rows } = await query(
    `SELECT ${CAMPOS}, count(*) OVER()::int AS total_geral
     FROM vendedores ${where}
     ORDER BY ativo DESC, nome
     LIMIT ${limite} OFFSET ${deslocamento}`,
    params
  )
  const total = rows[0]?.total_geral ?? 0
  return {
    vendedores: rows.map(({ total_geral, ...v }) => v),
    paginacao: { pagina, porPagina, total, totalPaginas: Math.ceil(total / porPagina) },
  }
}

export async function buscarVendedor(id) {
  const { rows } = await query(`SELECT ${CAMPOS} FROM vendedores WHERE id = $1`, [id])
  if (!rows[0]) throw new ErroVendedor(404, 'Vendedor não encontrado.')
  return rows[0]
}

// Uso interno do login: inclui o hash da senha
export async function buscarParaLogin(login) {
  const { rows } = await query(
    `SELECT id, login, nome, nome_fantasia, papel, ativo, senha_hash FROM vendedores WHERE login = $1`,
    [login]
  )
  return rows[0] ?? null
}

// Uso interno da autenticação: confere se o token ainda vale
export async function buscarEstadoSessao(id) {
  const { rows } = await query(
    `SELECT id, login, nome, nome_fantasia, papel, ativo, senha_alterada_em FROM vendedores WHERE id = $1`,
    [id]
  )
  return rows[0] ?? null
}

export async function registrarLogin(id) {
  await query('UPDATE vendedores SET ultimo_login_em = now() WHERE id = $1', [id])
}

// ---------------------------------------------------------------------------
// Alterações
// ---------------------------------------------------------------------------

// Cria um vendedor. Campos: login, nome, senha, telefone, cpf_cnpj?, nome_fantasia?, papel?
export async function criarVendedor(entrada) {
  const { dados, erros } = validarVendedor(entrada)
  lancarSeInvalido(erros)

  try {
    const { rows } = await query(
      `INSERT INTO vendedores (login, nome, senha_hash, telefone, cpf_cnpj, nome_fantasia, papel)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${CAMPOS}`,
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
    return rows[0]
  } catch (erro) {
    traduzirErroBanco(erro)
  }
}

// Campos que cada perfil pode alterar
const CAMPOS_PROPRIO = ['nome', 'telefone', 'cpf_cnpj', 'nome_fantasia']
const CAMPOS_ADMIN = [...CAMPOS_PROPRIO, 'login', 'papel', 'ativo']

// Atualiza dados (sem senha). "autor" é quem está fazendo a alteração (vem do token).
export async function atualizarVendedor(id, entrada, autor) {
  const ehAdmin = autor.papel === 'admin'
  const ehProprio = autor.id === id
  if (!ehAdmin && !ehProprio) throw new ErroVendedor(403, 'Você só pode alterar o seu próprio cadastro.')

  const enviados = Object.keys(entrada ?? {})
  if (enviados.includes('senha')) throw new ErroVendedor(400, 'Para trocar a senha use a rota de senha.')

  const permitidos = ehAdmin ? CAMPOS_ADMIN : CAMPOS_PROPRIO
  const proibidos = enviados.filter((c) => !permitidos.includes(c))
  if (proibidos.length) throw new ErroVendedor(403, `Você não pode alterar: ${proibidos.join(', ')}.`)

  const { dados, erros } = validarVendedor(entrada, { parcial: true })
  lancarSeInvalido(erros)
  if (!Object.keys(dados).length) throw new ErroVendedor(400, 'Nenhum campo para atualizar.')

  return transacao(async (db) => {
    const { rows: atual } = await db.query('SELECT papel, ativo FROM vendedores WHERE id = $1 FOR UPDATE', [id])
    if (!atual[0]) throw new ErroVendedor(404, 'Vendedor não encontrado.')

    // Proteções para a loja nunca ficar sem administrador
    const deixaDeSerAdminAtivo =
      atual[0].papel === 'admin' && atual[0].ativo && (dados.papel === 'vendedor' || dados.ativo === false)
    if (deixaDeSerAdminAtivo) {
      if (ehProprio) throw new ErroVendedor(409, 'Você não pode remover o seu próprio acesso de administrador.')
      if ((await contarAdminsAtivos(db, id)) === 0) {
        throw new ErroVendedor(409, 'A loja precisa de pelo menos um administrador ativo.')
      }
    }

    // Os nomes de coluna vêm da lista fixa CAMPOS_ADMIN (nunca do usuário)
    const colunas = Object.keys(dados)
    const sets = colunas.map((coluna, i) => `${coluna} = $${i + 2}`)
    // Desativar também invalida os tokens já emitidos
    if (dados.ativo === false) sets.push('senha_alterada_em = now()')

    try {
      const { rows } = await db.query(
        `UPDATE vendedores SET ${sets.join(', ')} WHERE id = $1 RETURNING ${CAMPOS}`,
        [id, ...colunas.map((c) => dados[c])]
      )
      return rows[0]
    } catch (erro) {
      traduzirErroBanco(erro)
    }
  })
}

// Troca de senha.
//   • O próprio vendedor precisa informar a senha atual.
//   • Um admin pode redefinir a senha de outro vendedor sem a senha atual.
// Depois da troca, todos os tokens antigos daquele vendedor deixam de valer.
export async function alterarSenha(id, { senhaAtual, novaSenha } = {}, autor) {
  const ehAdmin = autor.papel === 'admin'
  const ehProprio = autor.id === id
  if (!ehAdmin && !ehProprio) throw new ErroVendedor(403, 'Você só pode alterar a sua própria senha.')

  const erroSenha = validarSenha(novaSenha)
  if (erroSenha) throw new ErroVendedor(422, 'Dados inválidos.', { novaSenha: erroSenha })

  const { rows } = await query('SELECT senha_hash FROM vendedores WHERE id = $1', [id])
  if (!rows[0]) throw new ErroVendedor(404, 'Vendedor não encontrado.')

  if (ehProprio) {
    if (!senhaAtual || !(await conferirSenha(String(senhaAtual), rows[0].senha_hash))) {
      throw new ErroVendedor(422, 'Senha atual incorreta.', { senhaAtual: 'Senha atual incorreta.' })
    }
    if (await conferirSenha(novaSenha, rows[0].senha_hash)) {
      const msg = 'A nova senha deve ser diferente da atual.'
      throw new ErroVendedor(422, msg, { novaSenha: msg })
    }
  }

  await query('UPDATE vendedores SET senha_hash = $2, senha_alterada_em = now() WHERE id = $1', [
    id,
    await gerarHashSenha(novaSenha),
  ])
}

// "Excluir" = desativar (só admin). O histórico é preservado e o login fica bloqueado.
export function desativarVendedor(id, autor) {
  return atualizarVendedor(id, { ativo: false }, autor)
}
