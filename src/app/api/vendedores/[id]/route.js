// Um vendedor: ver, editar, desativar — a lógica fica em src/server (veja VendedorController)
import { vendedorController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const GET = vendedorController.buscar
export const PATCH = vendedorController.atualizar
export const DELETE = vendedorController.desativar
