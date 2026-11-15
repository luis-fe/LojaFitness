// POST /api/layout/publicar  { camadas: [...] } → publica no site (e salva como rascunho também). Somente ADMIN.
import { exigirAutenticacao } from '@/lib/auth'
import { publicar } from '@/lib/layout'
import { lerJson, corpoInvalido, responderErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const auth = await exigirAutenticacao(request, { papeis: ['admin'] })
  if (auth.erro) return auth.erro
  const corpo = await lerJson(request)
  if (!corpo) return corpoInvalido()
  try {
    return Response.json(await publicar(corpo.camadas, auth.vendedor))
  } catch (erro) {
    return responderErro(erro, 'POST /api/layout/publicar')
  }
}
