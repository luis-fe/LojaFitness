// Regras de pedido usadas pelo BACKEND (API Routes).
// O total é sempre recalculado aqui com os preços do servidor:
// nunca confiamos em preços enviados pelo navegador.

import { buscarProduto, TAMANHOS } from '@/lib/produtos'
import { linkWhatsApp, mensagemPedido } from '@/lib/whatsapp'

export const MAX_ITENS = 50

export function validarPedido(entrada) {
  const erros = []

  if (!Array.isArray(entrada) || entrada.length === 0) {
    return { ok: false, erros: ['O pedido está vazio.'] }
  }
  if (entrada.length > MAX_ITENS) {
    return { ok: false, erros: [`Máximo de ${MAX_ITENS} itens por pedido.`] }
  }

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
      erros.push(
        `${rotulo}: só há ${disponivel} disponíve${disponivel === 1 ? 'l' : 'is'} de ${produto.nome} ${item.cor} ${item.tamanho}.`
      )
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

  if (erros.length) return { ok: false, erros }

  const total = Math.round(itens.reduce((s, i) => s + i.subtotal, 0) * 100) / 100
  const mensagem = mensagemPedido(itens)

  return { ok: true, itens, total, mensagem, whatsappUrl: linkWhatsApp(mensagem) }
}
