// Rotas públicas da loja e utilitárias
//   GET  /api/produtos               catálogo público
//   GET  /api/produtos/:slug         um produto
//   POST /api/pedidos                confere o pedido e devolve o link do WhatsApp
//   GET  /api/saude                  status do servidor e do banco
//   GET  /api/vendedor/resumo        números da loja (login)
//   GET  /api/campanhas              campanhas para o cadastro de produtos (login)
import 'server-only'
import { ErroNaoEncontrado, ErroValidacao } from '@/server/erros'
import { produtos, buscarProduto } from '@/lib/produtos'

const produtoPublico = (p) => ({
  slug: p.slug,
  nome: p.nome,
  descricao: p.descricao,
  preco: p.preco,
  imagem: p.imagem.src,
  cores: p.cores,
  estoque: p.estoque,
})

export class LojaController {
  constructor({ rota, pedidoServico, painelServico }) {
    this.catalogo = rota(async () => ({ produtos: produtos.map(produtoPublico) }), { rotulo: 'GET /api/produtos' })

    this.produto = rota(
      async ({ params }) => {
        const p = buscarProduto(params.slug)
        if (!p) throw new ErroNaoEncontrado('Produto não encontrado.')
        return { produto: produtoPublico(p) }
      },
      { rotulo: 'GET /api/produtos/:slug' }
    )

    // O carrinho espera { erros: [...] } em caso de problema (mantém o formato da API)
    this.pedido = async (request) => {
      let corpo
      try {
        corpo = await request.json()
      } catch {
        return Response.json({ erros: ['Corpo da requisição inválido (JSON esperado).'] }, { status: 400 })
      }
      try {
        return Response.json(pedidoServico.validar(corpo?.itens))
      } catch (erro) {
        if (erro instanceof ErroValidacao) return Response.json({ erros: erro.listaErros ?? [erro.message] }, { status: 422 })
        console.error('[POST /api/pedidos]', erro)
        return Response.json({ erros: ['Erro interno. Tente novamente.'] }, { status: 500 })
      }
    }

    this.saude = async () => {
      const resultado = await painelServico.saude()
      return Response.json(resultado, { status: resultado.ok ? 200 : 503 })
    }

    this.resumo = rota(() => painelServico.resumo(), { autenticar: true, rotulo: 'GET /api/vendedor/resumo' })
    this.campanhas = rota(async () => ({ campanhas: await painelServico.listarCampanhas() }), { autenticar: true, rotulo: 'GET /api/campanhas' })
  }
}
