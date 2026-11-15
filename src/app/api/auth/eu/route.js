// GET /api/auth/eu — confere o token e devolve o vendedor da sessão
// Cabeçalho obrigatório: Authorization: Bearer <token>
import { exigirAutenticacao } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro
  return Response.json({ vendedor: auth.vendedor })
}
