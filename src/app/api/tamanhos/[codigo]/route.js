// /api/tamanhos/:codigo   (login)
// PATCH  { codigo?, nome?, sequencia? } → { tamanho }   mudar o código atualiza as variações
// DELETE → 204   (recusado com 409 se estiver em uso em variações de produtos)
import { exigirAutenticacao } from '@/lib/auth'
import { atualizarTamanho, excluirTamanho } from '@/lib/catalogo'
import { lerJson, corpoInvalido, responderErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

export async function PATCH(request, { params }) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro
  const corpo = await lerJson(request)
  if (!corpo) return corpoInvalido()
  try {
    return Response.json({ tamanho: await atualizarTamanho(decodeURIComponent((await params).codigo), corpo) })
  } catch (erro) {
    return responderErro(erro, 'PATCH /api/tamanhos/:codigo')
  }
}

export async function DELETE(request, { params }) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro
  try {
    await excluirTamanho(decodeURIComponent((await params).codigo))
    return new Response(null, { status: 204 })
  } catch (erro) {
    return responderErro(erro, 'DELETE /api/tamanhos/:codigo')
  }
}
