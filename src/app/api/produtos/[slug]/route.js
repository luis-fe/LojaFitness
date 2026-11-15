// Um produto do catálogo público — a lógica fica em src/server (veja LojaController)
import { lojaController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const GET = lojaController.produto
