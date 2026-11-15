// GET /api/auth/eu — devolve o usuário dono do token
// Cabeçalho obrigatório: Authorization: Bearer <token>
import { exigirAutenticacao } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro
  return Response.json({ usuario: auth.usuario })
}
