// /api/cores
// GET  → { cores: [{ codigo, nome, rgb, em_uso }] }        (público, por nome)
// POST { nome, rgb, codigo? } → 201 { cor }                (login; sem código = gerado pelo nome)
import { exigirAutenticacao } from '@/lib/auth'
import { listarCores, criarCor } from '@/lib/catalogo'
import { lerJson, corpoInvalido, responderErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return Response.json({ cores: await listarCores() })
  } catch (erro) {
    return responderErro(erro, 'GET /api/cores')
  }
}

export async function POST(request) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro
  const corpo = await lerJson(request)
  if (!corpo) return corpoInvalido()
  try {
    return Response.json({ cor: await criarCor(corpo) }, { status: 201 })
  } catch (erro) {
    return responderErro(erro, 'POST /api/cores')
  }
}
