// Regras de pedido: confere itens e estoque e recalcula o total com os preços do servidor
// (nunca confia em preços enviados pelo navegador), confere o cliente e grava cliente + pedido
// (situação 0 = Rascunho) + itens numa transação. Devolve o número, a mensagem e o link do WhatsApp.
import 'server-only'
import { ErroValidacao } from '@/server/erros'
import { linkWhatsApp, mensagemPedido } from '@/lib/whatsapp'
import { validarCliente } from '@/lib/cliente'
import { normalizarFrete } from '@/lib/frete'

export class PedidoServico {
  static MAX_ITENS = 50
  static LIMPEZA_A_CADA_MS = 60 * 60 * 1000 // limpeza de rascunhos antigos no máximo 1 vez por hora

  constructor({ catalogoServico, pedidoRepositorio }) {
    this.catalogo = catalogoServico
    this.pedidos = pedidoRepositorio
  }

  async validar(entrada, clienteEntrada, freteEntrada) {
    if (!Array.isArray(entrada) || entrada.length === 0) throw new ErroValidacao({ itens: 'O pedido está vazio.' }, 'O pedido está vazio.')
    if (entrada.length > PedidoServico.MAX_ITENS) throw new ErroValidacao({ itens: `Máximo de ${PedidoServico.MAX_ITENS} itens por pedido.` })

    const { dados: cliente, erros: errosCliente } = validarCliente(clienteEntrada ?? {})
    const catalogo = await this.catalogo.listar()
    const erros = Object.values(errosCliente)
    const frete = normalizarFrete(freteEntrada) // vazio = Combinar Frete
    if (frete === null) erros.push('Forma de envio inválida.')
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
        codigoProduto: produto.codigo,
        codigoCor: produto.cores.find((c) => c.nome === item.cor)?.codigo,
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

    const total = Math.round(itens.reduce((s, i) => s + i.subtotal, 0) * 100) / 100
    const pedido = await this.pedidos.criarRascunho({ cliente, itens, total, frete })
    this.#limparRascunhosSeNecessario()
    const mensagem = mensagemPedido(itens, cliente, pedido.codigo, frete)
    const publicos = itens.map(({ codigoProduto, codigoCor, ...resto }) => resto) // códigos internos ficam no servidor
    return { pedido: { codigo: pedido.codigo, situacao: pedido.situacao, frete }, itens: publicos, total, mensagem, whatsappUrl: linkWhatsApp(mensagem) }
  }

  // Rascunhos com mais de 15 dias saem sozinhos (não trava o pedido do cliente se falhar)
  #limparRascunhosSeNecessario() {
    const agora = Date.now()
    if (agora - (globalThis.__jlkUltimaLimpezaRascunhos ?? 0) < PedidoServico.LIMPEZA_A_CADA_MS) return
    globalThis.__jlkUltimaLimpezaRascunhos = agora
    this.pedidos
      .apagarRascunhosAntigos()
      .then((n) => n && console.log(`[pedidos] ${n} rascunho(s) com mais de 15 dias removido(s)`))
      .catch((erro) => console.error('[pedidos] falha ao limpar rascunhos antigos:', erro.message))
  }
}
