// Simular frete (Melhor Envio) — a lógica fica em src/server (veja FreteController)
import { freteController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const POST = freteController.simular
