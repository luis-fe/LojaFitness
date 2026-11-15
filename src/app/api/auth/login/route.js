// Login: { login, senha } → token JWT (3 h) — a lógica fica em src/server (veja AuthController)
import { authController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const POST = authController.entrar
