// Um tamanho — a lógica fica em src/server (veja TamanhoController)
import { tamanhoController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const PATCH = tamanhoController.atualizar
export const DELETE = tamanhoController.excluir
