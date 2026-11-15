// Vendedor da sessão (Bearer) — a lógica fica em src/server (veja AuthController)
import { authController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const GET = authController.eu
