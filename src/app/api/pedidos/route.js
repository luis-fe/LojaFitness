// Confere o pedido e devolve o link do WhatsApp — a lógica fica em src/server (veja LojaController)
import { lojaController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const POST = lojaController.pedido
