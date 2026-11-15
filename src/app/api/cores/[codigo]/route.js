// Uma cor — a lógica fica em src/server (veja CorController)
import { corController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const PATCH = corController.atualizar
export const DELETE = corController.excluir
