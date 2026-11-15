// Regras de pedido: confere itens e estoque e recalcula o total com os preços do servidor
// (nunca confia em preços enviados pelo navegador). Devolve a mensagem e o link do WhatsApp.
import 'server-only'
import { ErroValidacao } from '@/server/erros'
import { buscarProduto, TAMANHOS } from '@/lib/produtos'
import { linkWhatsApp, mensagemPedido } from '@/lib/whatsapp'

export class PedidoServico {
  static MAX_ITENS = 50

  validar(entrada) {
    if (!Array.isArray(entrada) || entrada.length === 0) throw new ErroValidacao({ itens: 'O pedido está vazio.' }, 'O pedido está vazio.')
    if (entrada.length > PedidoServico.MAX_ITENS) throw new ErroValidacao({ itens: `Máximo de ${PedidoServico.MAX_ITENS} itens por pedido.` })

    const erros = []
    const itens = []
    for (const [n, item] of entrada.entries()) {
      const produto = buscarProduto(item?.slug)
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
      if (!TAMANHOS.includes(item.tamanho)) {
        erros.push(`${rotulo}: tamanho "${item.tamanho}" inválido.`)
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

    const total = Math.round(itens.reduce((s, i) => s + i.subtotal, 0) * 100) / 100
    const mensagem = mensagemPedido(itens)
    return { itens, total, mensagem, whatsappUrl: linkWhatsApp(mensagem) }
  }
}
