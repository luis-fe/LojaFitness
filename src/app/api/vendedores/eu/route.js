// Meu cadastro — a lógica fica em src/server (veja VendedorController)
import { vendedorController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const GET = vendedorController.meuCadastro
export const PATCH = vendedorController.atualizarMeuCadastro
