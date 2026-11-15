// POST /api/auth/login — troca usuário e senha por um token JWT (válido por 3 horas)
//
// Corpo:     { "usuario": "maria", "senha": "********" }
// Resposta:  { "token": "eyJ...", "tipo": "Bearer", "expiraEm": "2026-11-15T18:00:00.000Z",
//              "expiraEmSegundos": 10800, "usuario": { "id": 1, "usuario": "maria", "nome": "Maria", "papel": "vendedor" } }
// Erros:     400 dados faltando · 401 usuário/senha incorretos · 429 muitas tentativas
import { query } from '@/lib/db'
import { criarToken } from '@/lib/auth'
import { conferirSenha, HASH_FICTICIO } from '@/lib/senha'
import { verificarLimite, registrarFalha, limparFalhas } from '@/lib/limiteTentativas'

export const dynamic = 'force-dynamic'

const CREDENCIAIS_INVALIDAS = 'Usuário ou senha incorretos.'

export async function POST(request) {
  let corpo
  try {
    corpo = await request.json()
  } catch {
    return Response.json({ erro: 'Corpo da requisição inválido (JSON esperado).' }, { status: 400 })
  }

  const usuario = String(corpo?.usuario ?? '').trim().toLowerCase()
  const senha = String(corpo?.senha ?? '')
  if (!usuario || !senha) {
    return Response.json({ erro: 'Informe usuário e senha.' }, { status: 400 })
  }
  if (usuario.length > 40 || senha.length > 200) {
    return Response.json({ erro: CREDENCIAIS_INVALIDAS }, { status: 401 })
  }

  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local'
  const chaveLimite = `${ip}|${usuario}`
  const limite = verificarLimite(chaveLimite)
  if (limite.bloqueado) {
    return Response.json(
      { erro: `Muitas tentativas. Tente novamente em ${Math.ceil(limite.tenteEmSegundos / 60)} minuto(s).` },
      { status: 429, headers: { 'Retry-After': String(limite.tenteEmSegundos) } }
    )
  }

  try {
    const { rows } = await query(
      'SELECT id, usuario, nome, papel, senha_hash, ativo FROM usuarios WHERE usuario = $1',
      [usuario]
    )
    const encontrado = rows[0]

    // Confere a senha mesmo quando o usuário não existe (mesmo tempo de resposta)
    const senhaOk = await conferirSenha(senha, encontrado?.senha_hash ?? HASH_FICTICIO)

    if (!encontrado || !senhaOk || !encontrado.ativo) {
      registrarFalha(chaveLimite)
      return Response.json({ erro: CREDENCIAIS_INVALIDAS }, { status: 401 })
    }

    limparFalhas(chaveLimite)
    await query('UPDATE usuarios SET ultimo_login_em = now() WHERE id = $1', [encontrado.id])

    const sessao = await criarToken(encontrado)
    return Response.json(
      {
        ...sessao,
        tipo: 'Bearer',
        usuario: { id: encontrado.id, usuario: encontrado.usuario, nome: encontrado.nome, papel: encontrado.papel },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (erro) {
    console.error('[api/auth/login]', erro.message)
    return Response.json({ erro: 'Não foi possível entrar agora. Tente novamente.' }, { status: 500 })
  }
}
