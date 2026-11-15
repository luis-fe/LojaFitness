// GET /api/produtos/:slug — detalhes de um produto
import { buscarProduto } from '@/lib/produtos'
import { produtoPublico } from '@/lib/api'

export async function GET(_request, { params }) {
  const { slug } = await params
  const produto = buscarProduto(slug)
  if (!produto) {
    return Response.json({ erro: 'Produto não encontrado.' }, { status: 404 })
  }
  return Response.json({ produto: produtoPublico(produto) })
}
