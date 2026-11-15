// Publicar layout (admin) — a lógica fica em src/server (veja LayoutController)
import { layoutController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const POST = layoutController.publicar
