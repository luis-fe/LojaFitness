// /api/vendedores/:id
//
// GET     → { vendedor }            ADMIN, ou o próprio vendedor
// PATCH   → { vendedor }            ADMIN (todos os campos), ou o próprio vendedor
//                                   (só nome, telefone, cpf_cnpj e nome_fantasia)
//           ex.: { "telefone": "11912345678", "nome_fantasia": null }
// DELETE  → { vendedor }            ADMIN — desativa (não apaga) e encerra as sessões dele
import { exigirAutenticacao } from '@/lib/auth'
import { buscarVendedor, atualizarVendedor, desativarVendedor } from '@/lib/vendedores'
import { lerJson, corpoInvalido, lerId, idInvalido, responderErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

const semPermissao = () =>
  Response.json({ erro: 'Sem permissão para este recurso.', codigo: 'sem_permissao' }, { status: 403 })

export async function GET(request, { params }) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro

  const id = lerId((await params).id)
  if (!id) return idInvalido()
  if (auth.vendedor.papel !== 'admin' && auth.vendedor.id !== id) return semPermissao()

  try {
    return Response.json({ vendedor: await buscarVendedor(id) })
  } catch (erro) {
    return responderErro(erro, 'GET /api/vendedores/:id')
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
    return Response.json({ vendedor: await atualizarVendedor(id, corpo, auth.vendedor) })
  } catch (erro) {
    return responderErro(erro, 'PATCH /api/vendedores/:id')
  }
}

export async function DELETE(request, { params }) {
  const auth = await exigirAutenticacao(request, { papeis: ['admin'] })
  if (auth.erro) return auth.erro

  const id = lerId((await params).id)
  if (!id) return idInvalido()

  try {
    return Response.json({ vendedor: await desativarVendedor(id, auth.vendedor) })
  } catch (erro) {
    return responderErro(erro, 'DELETE /api/vendedores/:id')
  }
}
