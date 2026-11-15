// POST /api/auth/login — troca login e senha por um token JWT (válido por 3 horas)
//
// Corpo:     { "login": "maria", "senha": "********" }
// Resposta:  { "token": "eyJ...", "tipo": "Bearer", "expiraEm": "2026-11-15T18:00:00.000Z",
//              "expiraEmSegundos": 10800,
//              "vendedor": { "id": 1, "login": "maria", "nome": "Maria", "nome_fantasia": null, "papel": "vendedor" } }
// Erros:     400 dados faltando · 401 login/senha incorretos · 429 muitas tentativas
import { criarToken } from '@/lib/auth'
import { conferirSenha, HASH_FICTICIO } from '@/lib/senha'
import { normalizarLogin } from '@/lib/validacao'
import { buscarParaLogin, registrarLogin } from '@/lib/vendedores'
import { verificarLimite, registrarFalha, limparFalhas } from '@/lib/limiteTentativas'
import { lerJson, corpoInvalido } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

const CREDENCIAIS_INVALIDAS = 'Login ou senha incorretos.'

export async function POST(request) {
  const corpo = await lerJson(request)
  if (!corpo) return corpoInvalido()

  // Aceita "login" (e "usuario", por compatibilidade)
  const login = normalizarLogin(corpo.login ?? corpo.usuario)
  const senha = String(corpo.senha ?? '')
  if (!login || !senha) {
    return Response.json({ erro: 'Informe login e senha.' }, { status: 400 })
  }
  if (login.length > 40 || senha.length > 200) {
    return Response.json({ erro: CREDENCIAIS_INVALIDAS }, { status: 401 })
  }

  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local'
  const chaveLimite = `${ip}|${login}`
  const limite = verificarLimite(chaveLimite)
  if (limite.bloqueado) {
    return Response.json(
      { erro: `Muitas tentativas. Tente novamente em ${Math.ceil(limite.tenteEmSegundos / 60)} minuto(s).` },
      { status: 429, headers: { 'Retry-After': String(limite.tenteEmSegundos) } }
    )
  }

  try {
    const vendedor = await buscarParaLogin(login)

    // Confere a senha mesmo quando o login não existe (mesmo tempo de resposta)
    const senhaOk = await conferirSenha(senha, vendedor?.senha_hash ?? HASH_FICTICIO)

    if (!vendedor || !senhaOk) {
      registrarFalha(chaveLimite)
      return Response.json({ erro: CREDENCIAIS_INVALIDAS }, { status: 401 })
    }
    if (!vendedor.ativo) {
      return Response.json({ erro: 'Acesso desativado. Fale com o administrador da loja.' }, { status: 403 })
    }

    limparFalhas(chaveLimite)
    await registrarLogin(vendedor.id)

    const sessao = await criarToken(vendedor)
    const { senha_hash, ativo, ...publico } = vendedor
    return Response.json({ ...sessao, tipo: 'Bearer', vendedor: publico }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (erro) {
    console.error('[api/auth/login]', erro.message)
    return Response.json({ erro: 'Não foi possível entrar agora. Tente novamente.' }, { status: 500 })
  }
}
