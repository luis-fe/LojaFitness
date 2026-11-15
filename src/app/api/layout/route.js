// /api/layout — layout da página inicial (somente ADMIN)
//
// GET  → { rascunho, publicado, atualizadoEm, publicadoEm, atualizadoPor, publicadoPor, padrao }
// PUT  { camadas: [...] } → salva o RASCUNHO (o site não muda)
import { exigirAutenticacao } from '@/lib/auth'
import { obterLayoutEditor, salvarRascunho } from '@/lib/layout'
import { lerJson, corpoInvalido, responderErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const auth = await exigirAutenticacao(request, { papeis: ['admin'] })
  if (auth.erro) return auth.erro
  try {
    return Response.json(await obterLayoutEditor())
  } catch (erro) {
    return responderErro(erro, 'GET /api/layout')
  }
}

export async function PUT(request) {
  const auth = await exigirAutenticacao(request, { papeis: ['admin'] })
  if (auth.erro) return auth.erro
  const corpo = await lerJson(request)
  if (!corpo) return corpoInvalido()
  try {
    return Response.json(await salvarRascunho(corpo.camadas, auth.vendedor))
  } catch (erro) {
    return responderErro(erro, 'PUT /api/layout')
  }
}
