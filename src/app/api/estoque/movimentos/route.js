// Movimentação de estoque — veja EstoqueController
import { estoqueController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const GET = estoqueController.movimentos
