import { WHATSAPP_NUMERO } from '@/lib/config'
import { formatarPreco } from '@/lib/produtos'
import { formatarCep } from '@/lib/cliente'
import { descricaoFrete } from '@/lib/frete'

export function linkWhatsApp(mensagem) {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`
}

const LINHA = '_____________________________'

// Mensagem do pedido enviada pelo WhatsApp:
//
//   Olá!
//   Gostaria de realizar a compra de:
//   _____________________________
//   *Conjunto Calça*
//   Tam: P / Cor: Azul / Qt. 2 / Preço R$ 159,90
//   ...
//   _____________________________
//   *Valor Total: R$ 319,80*
//
//   *Dados para Entrega*
//   Nome / CEP / Bairro / Cidade - UF
//   Forma de envio: Combinar Frete
//
//   Pedido: JLK-000001
//   servico (Receber em casa): { nome, empresa, preco, prazo } → linha do frete e total com frete
export function mensagemPedido(itens, cliente, codigoPedido, frete = null, servico = null) {
  const produtosTotal = itens.reduce((s, i) => s + i.preco * i.quantidade, 0)
  const total = produtosTotal + (servico ? Number(servico.preco) : 0)
  const produtos = itens.flatMap((i) => [`*${i.nome}*`, `Tam: ${i.tamanho} / Cor: ${i.cor} / Qt. ${i.quantidade} / Preço ${formatarPreco(i.preco)}`])
  return [
    'Olá!',
    'Gostaria de realizar a compra de:',
    LINHA,
    ...produtos,
    LINHA,
    ...(servico ? [`Produtos: ${formatarPreco(produtosTotal)}`, `Frete ${[servico.empresa, servico.nome].filter(Boolean).join(' ')}: ${formatarPreco(servico.preco)}${servico.prazo ? ` (até ${servico.prazo} dias úteis)` : ''}`] : []),
    `*Valor Total: ${formatarPreco(total)}*`,
    ...(cliente
      ? ['', '*Dados para Entrega*', `Nome: ${cliente.nome}`, `CEP: ${formatarCep(cliente.cep)}`, `Bairro: ${cliente.bairro}`, `Cidade: ${cliente.cidade} - ${cliente.estado}`]
      : []),
    ...(descricaoFrete(frete) ? [`Forma de envio: ${descricaoFrete(frete)}`] : []),
    ...(codigoPedido ? ['', `Pedido: ${codigoPedido}`] : []),
  ].join('\n')
}
