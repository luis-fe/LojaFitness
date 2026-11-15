// /api/imagens/:id  (exige login)
//
// GET     → { imagem }
// PATCH   → { imagem }   { "codigo": "NOVO-CODIGO", "descricao": "..." }  (quem enviou, ou admin)
// DELETE  → 204          apaga o registro e o arquivo do volume       (quem enviou, ou admin)
import { exigirAutenticacao } from '@/lib/auth'
import { buscarImagem, atualizarImagem, excluirImagem } from '@/lib/imagens'
import { lerJson, corpoInvalido, lerId, idInvalido, responderErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro
  const id = lerId((await params).id)
  if (!id) return idInvalido()
  try {
    return Response.json({ imagem: await buscarImagem(id) })
  } catch (erro) {
    return responderErro(erro, 'GET /api/imagens/:id')
  }
}

export async function PATCH(request, { params }) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro
  const id = lerId((await params).id)
  if (!id) return idInvalido()
  const corpo = await lerJson(request)
  if (!corpo) return corpoInvalido()
  try {
    return Response.json({ imagem: await atualizarImagem(id, corpo, auth.vendedor) })
  } catch (erro) {
    return responderErro(erro, 'PATCH /api/imagens/:id')
  }
}

export async function DELETE(request, { params }) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro
  const id = lerId((await params).id)
  if (!id) return idInvalido()
  try {
    await excluirImagem(id, auth.vendedor)
    return new Response(null, { status: 204 })
  } catch (erro) {
    return responderErro(erro, 'DELETE /api/imagens/:id')
  }
}
