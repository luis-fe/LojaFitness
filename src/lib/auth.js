// Autenticação por JWT (JSON Web Token) — somente no servidor.
//
// Fluxo:
//   1. POST /api/auth/login com { usuario, senha }  →  { token, expiraEm, ... }
//   2. O navegador guarda o token e envia em toda chamada protegida:
//        Authorization: Bearer <token>
//   3. As APIs protegidas usam exigirAutenticacao(request) para validar.
//
// O token é assinado com JWT_SECRET (HS256) e expira em JWT_EXPIRACAO (padrão: 3 horas).
import 'server-only'
import { SignJWT, jwtVerify, errors } from 'jose'

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

export async function criarToken(usuario) {
  const token = await new SignJWT({ usuario: usuario.usuario, nome: usuario.nome, papel: usuario.papel })
    .setProtectedHeader({ alg: ALGORITMO, typ: 'JWT' })
    .setSubject(String(usuario.id))
    .setIssuer(EMISSOR)
    .setAudience(AUDIENCIA)
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRACAO || EXPIRACAO_PADRAO)
    .sign(chaveSecreta())

  const { exp, iat } = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
  return { token, expiraEm: new Date(exp * 1000).toISOString(), expiraEmSegundos: exp - iat }
}

export async function verificarToken(token) {
  const { payload } = await jwtVerify(token, chaveSecreta(), {
    issuer: EMISSOR,
    audience: AUDIENCIA,
    algorithms: [ALGORITMO],
  })
  return {
    id: Number(payload.sub),
    usuario: payload.usuario,
    nome: payload.nome,
    papel: payload.papel,
    expiraEm: new Date(payload.exp * 1000).toISOString(),
  }
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
//   auth.usuario  →  { id, usuario, nome, papel, expiraEm }
//
// Para restringir por papel: exigirAutenticacao(request, { papeis: ['admin'] })
export async function exigirAutenticacao(request, { papeis } = {}) {
  const token = lerBearer(request)
  if (!token) {
    return { erro: naoAutorizado('Envie o cabeçalho Authorization: Bearer <token>.', 'token_ausente') }
  }

  let usuario
  try {
    usuario = await verificarToken(token)
  } catch (erro) {
    if (erro instanceof errors.JWTExpired) {
      return { erro: naoAutorizado('Sessão expirada. Faça login novamente.', 'token_expirado') }
    }
    if (erro instanceof errors.JOSEError) {
      return { erro: naoAutorizado('Token inválido.', 'token_invalido') }
    }
    throw erro // JWT_SECRET não configurado etc.
  }

  if (papeis && !papeis.includes(usuario.papel)) {
    return { erro: Response.json({ erro: 'Sem permissão para este recurso.', codigo: 'sem_permissao' }, { status: 403 }) }
  }

  return { usuario }
}
