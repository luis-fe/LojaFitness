// Regras de pedido: confere itens e estoque e recalcula o total com os preços do servidor
// (nunca confia em preços enviados pelo navegador), confere e grava o cliente (tabela clientes)
// e devolve a mensagem e o link do WhatsApp.
import 'server-only'
import { ErroValidacao } from '@/server/erros'
import { linkWhatsApp, mensagemPedido } from '@/lib/whatsapp'
import { validarCliente } from '@/lib/cliente'

export class PedidoServico {
  static MAX_ITENS = 50

  constructor({ catalogoServico, clienteRepositorio }) {
    this.catalogo = catalogoServico
    this.clientes = clienteRepositorio
  }

  async validar(entrada, clienteEntrada) {
    if (!Array.isArray(entrada) || entrada.length === 0) throw new ErroValidacao({ itens: 'O pedido está vazio.' }, 'O pedido está vazio.')
    if (entrada.length > PedidoServico.MAX_ITENS) throw new ErroValidacao({ itens: `Máximo de ${PedidoServico.MAX_ITENS} itens por pedido.` })

    const { dados: cliente, erros: errosCliente } = validarCliente(clienteEntrada ?? {})
    const catalogo = await this.catalogo.listar()
    const erros = Object.values(errosCliente)
    const itens = []
    for (const [n, item] of entrada.entries()) {
      const produto = catalogo.find((p) => p.slug === item?.slug)
      const quantidade = Number(item?.quantidade)
      const rotulo = `Item ${n + 1}`

      if (!produto) {
        erros.push(`${rotulo}: produto não encontrado.`)
        continue
      }
      if (!produto.cores.some((c) => c.nome === item.cor)) {
        erros.push(`${rotulo}: cor "${item.cor}" indisponível para ${produto.nome}.`)
        continue
      }
      if (produto.estoque[item.cor]?.[item.tamanho] === undefined) {
        erros.push(`${rotulo}: ${produto.nome} ${item.cor} não possui o tamanho "${item.tamanho}".`)
        continue
      }
      if (!Number.isInteger(quantidade) || quantidade < 1) {
        erros.push(`${rotulo}: quantidade inválida.`)
        continue
      }
      const disponivel = produto.estoque[item.cor]?.[item.tamanho] ?? 0
      if (quantidade > disponivel) {
        erros.push(`${rotulo}: só há ${disponivel} disponíve${disponivel === 1 ? 'l' : 'is'} de ${produto.nome} ${item.cor} ${item.tamanho}.`)
        continue
      }
      itens.push({
        slug: produto.slug,
        nome: produto.nome,
        cor: item.cor,
        tamanho: item.tamanho,
        quantidade,
        preco: produto.preco,
        subtotal: Math.round(produto.preco * quantidade * 100) / 100,
      })
    }

    if (erros.length) {
      const e = new ErroValidacao(undefined, erros[0])
      e.listaErros = erros
      throw e
    }

    await this.clientes.salvar(cliente)
    const total = Math.round(itens.reduce((s, i) => s + i.subtotal, 0) * 100) / 100
    const mensagem = mensagemPedido(itens, cliente)
    return { itens, total, mensagem, whatsappUrl: linkWhatsApp(mensagem) }
  }
}
