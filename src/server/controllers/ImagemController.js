// Rotas de imagens (exigem login, exceto a entrega pública do arquivo).
//
//   GET/POST          /api/imagens          lista (busca, página) / envio multipart: arquivo, codigo, descricao
//   GET/PATCH/DELETE  /api/imagens/:id      quem enviou, ou admin, edita/exclui
//   GET               /arquivos/:nome       público (usado nas páginas da loja)
import 'server-only'
import { Resposta } from '@/server/http/Rota'
import { ErroRequisicao } from '@/server/erros'

const lerId = (valor) => {
  const id = Number(valor)
  if (!Number.isSafeInteger(id) || id < 1) throw new ErroRequisicao('Id inválido.')
  return id
}

export class ImagemController {
  constructor({ rota, imagemServico: s }) {
    const logado = { autenticar: true }

    this.listar = rota(
      async ({ request }) => {
        const p = new URL(request.url).searchParams
        return s.listar({ busca: p.get('busca') ?? '', pagina: p.get('pagina'), porPagina: p.get('porPagina') })
      },
      { ...logado, rotulo: 'GET /api/imagens' }
    )

    // O tamanho é conferido ANTES de ler o corpo (por isso o formulário é lido aqui dentro)
    this.enviar = rota(
      async ({ request, vendedor }) => {
        s.conferirTamanhoDeclarado(Number(request.headers.get('content-length') || 0))
        let formulario
        try {
          formulario = await request.formData()
        } catch {
          throw new ErroRequisicao('Envie o formulário como multipart/form-data.')
        }
        const imagem = await s.criar(
          { arquivo: formulario.get('arquivo'), codigo: formulario.get('codigo'), descricao: formulario.get('descricao') },
          vendedor
        )
        return Resposta.criado({ imagem })
      },
      { ...logado, rotulo: 'POST /api/imagens' }
    )

    this.buscar = rota(async ({ params }) => ({ imagem: await s.buscar(lerId(params.id)) }), { ...logado, rotulo: 'GET /api/imagens/:id' })

    this.atualizar = rota(async ({ params, corpo, vendedor }) => ({ imagem: await s.atualizar(lerId(params.id), corpo, vendedor) }), {
      ...logado,
      corpo: 'json',
      rotulo: 'PATCH /api/imagens/:id',
    })

    this.excluir = rota(
      async ({ params, vendedor }) => {
        await s.excluir(lerId(params.id), vendedor)
        return Resposta.semConteudo()
      },
      { ...logado, rotulo: 'DELETE /api/imagens/:id' }
    )

    this.arquivo = rota(
      async ({ params }) => {
        const arquivo = await s.abrirArquivo(params.nome)
        if (!arquivo) return new Response('Imagem não encontrada.', { status: 404 })
        return new Response(arquivo.conteudo, {
          headers: {
            'Content-Type': arquivo.tipo,
            'Content-Length': String(arquivo.tamanho),
            // O nome muda a cada envio, então a imagem pode ficar em cache por muito tempo
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff',
          },
        })
      },
      { rotulo: 'GET /arquivos/:nome' }
    )
  }
}
