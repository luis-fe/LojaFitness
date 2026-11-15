// Uma imagem: ver, editar, excluir — a lógica fica em src/server (veja ImagemController)
import { imagemController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const GET = imagemController.buscar
export const PATCH = imagemController.atualizar
export const DELETE = imagemController.excluir
