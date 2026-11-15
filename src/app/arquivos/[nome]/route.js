// Entrega pública da imagem guardada no volume — a lógica fica em src/server (veja ImagemController)
import { imagemController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const GET = imagemController.arquivo
