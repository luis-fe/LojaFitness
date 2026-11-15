// Autenticação por JWT (JSON Web Token) — somente no servidor.
//
// Fluxo:
//   1. POST /api/auth/login com { login, senha }  →  { token, expiraEm, ... }
//   2. O navegador guarda o token e envia em toda chamada protegida:
//        Authorization: Bearer <token>
//   3. As APIs protegidas usam exigirAutenticacao(request) para validar.
//
// O token é assinado com JWT_SECRET (HS256) e expira em JWT_EXPIRACAO (padrão: 3 horas).
// Além da assinatura, a cada chamada conferimos no banco se o vendedor continua ativo
// e se o token não é anterior a uma troca de senha (assim dá para "derrubar" sessões).
import 'server-only'
import { SignJWT, jwtVerify, errors } from 'jose'
import { buscarEstadoSessao } from '@/lib/vendedores'

const EMISSOR = 'jlk-loja'
const AUDIENCIA = 'jlk-area-do-vendedor'
const ALGORITMO = 'HS256'

export const EXPIRACAO_PADRAO = '3h'

function chaveSecreta() {
  const segredo = process.env.JWT_SECRET
  if (!segredo || segredo.length < 32) {
    throw new Error('JWT_SECRET ausente ou curto demais (mínimo 32 caracteres). Veja .env.example.')
  }
  return new TextEncoder().encode(segredo)
}

export async function criarToken(vendedor) {
  const token = await new SignJWT({ login: vendedor.login, nome: vendedor.nome, papel: vendedor.papel })
    .setProtectedHeader({ alg: ALGORITMO, typ: 'JWT' })
    .setSubject(String(vendedor.id))
    .setIssuer(EMISSOR)
    .setAudience(AUDIENCIA)
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRACAO || EXPIRACAO_PADRAO)
    .sign(chaveSecreta())

  const { exp, iat } = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
  return { token, expiraEm: new Date(exp * 1000).toISOString(), expiraEmSegundos: exp - iat }
}

async function verificarToken(token) {
  const { payload } = await jwtVerify(token, chaveSecreta(), {
    issuer: EMISSOR,
    audience: AUDIENCIA,
    algorithms: [ALGORITMO],
  })
  return payload
}

function lerBearer(request) {
  const cabecalho = request.headers.get('authorization') || ''
  const [tipo, token] = cabecalho.split(' ')
  return tipo?.toLowerCase() === 'bearer' && token ? token.trim() : null
}

function naoAutorizado(mensagem, codigo) {
  return Response.json(
    { erro: mensagem, codigo },
    { status: 401, headers: { 'WWW-Authenticate': `Bearer realm="jlk", error="${codigo}"` } }
  )
}

// Use no início de qualquer API protegida:
//
//   const auth = await exigirAutenticacao(request)
//   if (auth.erro) return auth.erro
//   auth.vendedor  →  { id, login, nome, nome_fantasia, papel, expiraEm }
//
// Para restringir por papel: exigirAutenticacao(request, { papeis: ['admin'] })
export async function exigirAutenticacao(request, { papeis } = {}) {
  const token = lerBearer(request)
  if (!token) {
    return { erro: naoAutorizado('Envie o cabeçalho Authorization: Bearer <token>.', 'token_ausente') }
  }

  let payload
  try {
    payload = await verificarToken(token)
  } catch (erro) {
    if (erro instanceof errors.JWTExpired) {
      return { erro: naoAutorizado('Sessão expirada. Faça login novamente.', 'token_expirado') }
    }
    if (erro instanceof errors.JOSEError) {
      return { erro: naoAutorizado('Token inválido.', 'token_invalido') }
    }
    throw erro // JWT_SECRET não configurado etc.
  }

  // Confere no banco: vendedor existe, está ativo e o token é posterior à última troca de senha
  const atual = await buscarEstadoSessao(Number(payload.sub))
  if (!atual || !atual.ativo) {
    return { erro: naoAutorizado('Acesso desativado. Fale com o administrador da loja.', 'conta_inativa') }
  }
  if (Math.floor(new Date(atual.senha_alterada_em).getTime() / 1000) > payload.iat) {
    return { erro: naoAutorizado('A senha foi alterada. Faça login novamente.', 'token_revogado') }
  }

  // Usa o papel atual do banco (se o admin mudar o papel, vale na hora)
  const vendedor = {
    id: atual.id,
    login: atual.login,
    nome: atual.nome,
    nome_fantasia: atual.nome_fantasia,
    papel: atual.papel,
    expiraEm: new Date(payload.exp * 1000).toISOString(),
  }

  if (papeis && !papeis.includes(vendedor.papel)) {
    return {
      erro: Response.json({ erro: 'Sem permissão para este recurso.', codigo: 'sem_permissao' }, { status: 403 }),
    }
  }

  return { vendedor }
}
