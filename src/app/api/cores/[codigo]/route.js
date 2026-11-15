// /api/cores/:codigo   (login)
// PATCH  { codigo?, nome?, rgb? } → { cor }   mudar o código atualiza as variações
// DELETE → 204   (recusado com 409 se estiver em uso em variações de produtos)
import { exigirAutenticacao } from '@/lib/auth'
import { atualizarCor, excluirCor } from '@/lib/catalogo'
import { lerJson, corpoInvalido, responderErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

export async function PATCH(request, { params }) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro
  const corpo = await lerJson(request)
  if (!corpo) return corpoInvalido()
  try {
    return Response.json({ cor: await atualizarCor(decodeURIComponent((await params).codigo), corpo) })
  } catch (erro) {
    return responderErro(erro, 'PATCH /api/cores/:codigo')
  }
}

export async function DELETE(request, { params }) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro
  try {
    await excluirCor(decodeURIComponent((await params).codigo))
    return new Response(null, { status: 204 })
  } catch (erro) {
    return responderErro(erro, 'DELETE /api/cores/:codigo')
  }
}
