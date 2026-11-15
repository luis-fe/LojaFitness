// PUT /api/tamanhos/ordem  { codigos: ['PP', 'P', 'M', ...] } → { tamanhos }   (login)
// Define a sequência de exibição de todos os tamanhos de uma vez.
import { exigirAutenticacao } from '@/lib/auth'
import { reordenarTamanhos } from '@/lib/catalogo'
import { lerJson, corpoInvalido, responderErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

export async function PUT(request) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro
  const corpo = await lerJson(request)
  if (!corpo) return corpoInvalido()
  try {
    return Response.json({ tamanhos: await reordenarTamanhos(corpo.codigos) })
  } catch (erro) {
    return responderErro(erro, 'PUT /api/tamanhos/ordem')
  }
}
