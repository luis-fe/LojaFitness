// Minha Empresa — a lógica fica em src/server (veja EmpresaController)
import { empresaController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const GET = empresaController.buscar
export const PUT = empresaController.salvar
