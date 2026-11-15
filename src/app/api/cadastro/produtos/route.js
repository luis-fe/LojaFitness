// Cadastro de produtos — a lógica fica em src/server (veja ProdutoController)
import { produtoController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const GET = produtoController.listar
export const POST = produtoController.criar
