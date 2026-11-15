// PUT /api/vendedores/:id/senha — troca de senha
//
// Próprio vendedor:  { "senhaAtual": "********", "novaSenha": "********" }
// ADMIN (redefinir a senha de outro vendedor):  { "novaSenha": "********" }
//
// → 204 sem corpo. Todas as sessões (tokens) antigas desse vendedor deixam de valer.
import { exigirAutenticacao } from '@/lib/auth'
import { alterarSenha } from '@/lib/vendedores'
import { lerJson, corpoInvalido, lerId, idInvalido, responderErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

export async function PUT(request, { params }) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro

  const id = lerId((await params).id)
  if (!id) return idInvalido()

  const corpo = await lerJson(request)
  if (!corpo) return corpoInvalido()

  try {
    await alterarSenha(id, corpo, auth.vendedor)
    return new Response(null, { status: 204 })
  } catch (erro) {
    return responderErro(erro, 'PUT /api/vendedores/:id/senha')
  }
}
