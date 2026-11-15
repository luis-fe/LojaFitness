// Imagens: listar e enviar (multipart) — a lógica fica em src/server (veja ImagemController)
import { imagemController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const GET = imagemController.listar
export const POST = imagemController.enviar
