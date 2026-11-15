// Um produto e suas variações — a lógica fica em src/server (veja ProdutoController)
import { produtoController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const GET = produtoController.buscar
export const PATCH = produtoController.atualizar
export const DELETE = produtoController.excluir
