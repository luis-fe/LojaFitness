// Produtos com estoque — veja EstoqueController
import { estoqueController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const GET = estoqueController.produtos
