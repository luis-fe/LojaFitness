// Vendedores: listar e cadastrar (admin) — a lógica fica em src/server (veja VendedorController)
import { vendedorController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const GET = vendedorController.listar
export const POST = vendedorController.criar
