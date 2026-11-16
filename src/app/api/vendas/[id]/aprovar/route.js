// Aprovar pagamento do pedido — veja VendaController
import { vendaController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const POST = vendaController.aprovar
