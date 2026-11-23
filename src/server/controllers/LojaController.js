// Rotas públicas da loja e utilitárias
//   GET  /api/produtos               catálogo público
//   GET  /api/produtos/:slug         um produto
//   GET  /api/selos                  Selos-Campanha (itens do menu lateral)
//   GET  /api/retirada               local de retirada: localização da empresa (Minha Empresa);
//                                    sem ela, o endereço dos vendedores ativos
//   GET  /api/contato                WhatsApp da loja (Minha Empresa → Contato)
//   POST /api/pedidos                confere o pedido e devolve o link do WhatsApp
//   GET  /api/saude                  status do servidor e do banco
//   GET  /api/vendedor/resumo        números da loja (login)
//   GET  /api/campanhas              campanhas para o cadastro de produtos (login)
import 'server-only'
import { ErroNaoEncontrado, ErroValidacao } from '@/server/erros'
import { WHATSAPP_NUMERO } from '@/lib/config'

export class LojaController {
  constructor({ rota, pedidoServico, painelServico, catalogoServico, vendedorServico, empresaServico }) {
    this.catalogo = rota(async () => ({ produtos: await catalogoServico.listar() }), { rotulo: 'GET /api/produtos' })

    this.selos = rota(async () => ({ selos: await catalogoServico.listarSelos() }), { rotulo: 'GET /api/selos' })

    this.contato = rota(async () => ({ whatsapp: (await empresaServico.whatsapp()) || WHATSAPP_NUMERO || null }), { rotulo: 'GET /api/contato' })

    this.retirada = rota(
      async () => {
        const empresa = await empresaServico.localRetirada()
        return { locais: empresa ? [empresa] : await vendedorServico.locaisRetirada() }
      },
      { rotulo: 'GET /api/retirada' }
    )

    this.produto = rota(
      async ({ params }) => {
        const produto = await catalogoServico.buscar(params.slug)
        if (!produto) throw new ErroNaoEncontrado('Produto não encontrado.')
        return { produto }
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
        return Response.json(await pedidoServico.validar(corpo?.itens, corpo?.cliente, corpo?.frete, corpo?.envio))
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
