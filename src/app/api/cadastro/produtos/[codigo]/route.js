// /api/cadastro/produtos/:codigo   (login)
// GET    → { produto } com filhos: [{ id, cor, cor_nome, rgb, tamanho, tamanho_nome, estoque }]
// PATCH  → { produto }  campos do produto e/ou filhos (a lista enviada substitui as variações)
// DELETE → 204          apaga o produto e as variações
import { exigirAutenticacao } from '@/lib/auth'
import { buscarProduto, atualizarProduto, excluirProduto } from '@/lib/cadastroProdutos'
import { lerJson, corpoInvalido, responderErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

const codigoDe = async (params) => decodeURIComponent((await params).codigo)

export async function GET(request, { params }) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro
  try {
    return Response.json({ produto: await buscarProduto(await codigoDe(params)) })
  } catch (erro) {
    return responderErro(erro, 'GET /api/cadastro/produtos/:codigo')
  }
}

export async function PATCH(request, { params }) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro
  const corpo = await lerJson(request)
  if (!corpo) return corpoInvalido()
  try {
    return Response.json({ produto: await atualizarProduto(await codigoDe(params), corpo, auth.vendedor) })
  } catch (erro) {
    return responderErro(erro, 'PATCH /api/cadastro/produtos/:codigo')
  }
}

export async function DELETE(request, { params }) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro
  try {
    await excluirProduto(await codigoDe(params))
    return new Response(null, { status: 204 })
  } catch (erro) {
    return responderErro(erro, 'DELETE /api/cadastro/produtos/:codigo')
  }
}
