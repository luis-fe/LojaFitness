// GET /api/campanhas → { campanhas: [{ id, nome, desconto_percentual, inicio, fim, ativa, vigente }] }   (login)
import { exigirAutenticacao } from '@/lib/auth'
import { listarCampanhas } from '@/lib/cadastroProdutos'
import { responderErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro
  try {
    return Response.json({ campanhas: await listarCampanhas() })
  } catch (erro) {
    return responderErro(erro, 'GET /api/campanhas')
  }
}
