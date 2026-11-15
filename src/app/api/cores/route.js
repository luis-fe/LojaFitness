// Cores — a lógica fica em src/server (veja CorController)
import { corController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const GET = corController.listar
export const POST = corController.criar
