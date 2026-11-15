// GET /arquivos/<nome> — entrega publicamente uma imagem guardada no volume
// (é o endereço usado nas páginas da loja). O nome é aleatório e só existe se estiver no banco.
import { lerArquivo } from '@/lib/armazenamento'
import { buscarPorArquivo } from '@/lib/imagens'

export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  const { nome } = await params
  const registro = await buscarPorArquivo(nome).catch(() => null)
  if (!registro) return new Response('Imagem não encontrada.', { status: 404 })

  const arquivo = await lerArquivo(nome)
  if (!arquivo) return new Response('Imagem não encontrada.', { status: 404 })

  return new Response(arquivo.conteudo, {
    headers: {
      'Content-Type': registro.tipo_mime,
      'Content-Length': String(arquivo.tamanho),
      // O nome muda a cada envio, então a imagem pode ficar em cache por muito tempo
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
