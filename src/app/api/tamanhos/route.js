// /api/tamanhos
// GET  → { tamanhos: [{ codigo, nome, sequencia, em_uso }] }   (público, na ordem de exibição)
// POST { codigo, nome, sequencia? } → 201 { tamanho }          (login; sem sequência = vai para o fim)
import { exigirAutenticacao } from '@/lib/auth'
import { listarTamanhos, criarTamanho } from '@/lib/catalogo'
import { lerJson, corpoInvalido, responderErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return Response.json({ tamanhos: await listarTamanhos() })
  } catch (erro) {
    return responderErro(erro, 'GET /api/tamanhos')
  }
}

export async function POST(request) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro
  const corpo = await lerJson(request)
  if (!corpo) return corpoInvalido()
  try {
    return Response.json({ tamanho: await criarTamanho(corpo) }, { status: 201 })
  } catch (erro) {
    return responderErro(erro, 'POST /api/tamanhos')
  }
}
