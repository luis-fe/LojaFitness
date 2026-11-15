// PUT /api/vendedores/eu/senha — o vendedor logado troca a própria senha
//
// { "senhaAtual": "********", "novaSenha": "********" }
// → 204 sem corpo. As sessões antigas deixam de valer (é preciso entrar de novo).
import { exigirAutenticacao } from '@/lib/auth'
import { alterarSenha } from '@/lib/vendedores'
import { lerJson, corpoInvalido, responderErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

export async function PUT(request) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro

  const corpo = await lerJson(request)
  if (!corpo) return corpoInvalido()

  try {
    // Força o fluxo do "próprio vendedor" (exige senha atual), mesmo para admin
    await alterarSenha(auth.vendedor.id, corpo, { ...auth.vendedor, papel: 'vendedor' })
    return new Response(null, { status: 204 })
  } catch (erro) {
    return responderErro(erro, 'PUT /api/vendedores/eu/senha')
  }
}
