// Extrato do pedido por SKU — veja VendaController
import { vendaController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const GET = vendaController.extrato
export const DELETE = vendaController.excluir
