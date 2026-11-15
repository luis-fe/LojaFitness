// GET /api/produtos — lista todos os produtos
import { produtos } from '@/lib/produtos'
import { produtoPublico } from '@/lib/api'

export function GET() {
  return Response.json({ produtos: produtos.map(produtoPublico) })
}
