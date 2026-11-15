// Troca / redefinição de senha — a lógica fica em src/server (veja VendedorController)
import { vendedorController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const PUT = vendedorController.alterarSenha
