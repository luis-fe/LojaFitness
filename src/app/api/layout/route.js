// Layout da página inicial (admin) — a lógica fica em src/server (veja LayoutController)
import { layoutController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const GET = layoutController.editor
export const PUT = layoutController.salvarRascunho
