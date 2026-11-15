// Tamanhos — a lógica fica em src/server (veja TamanhoController)
import { tamanhoController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const GET = tamanhoController.listar
export const POST = tamanhoController.criar
