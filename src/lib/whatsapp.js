import { WHATSAPP_NUMERO, NOME_LOJA } from '@/lib/config'
import { formatarPreco } from '@/lib/produtos'
import { formatarCep } from '@/lib/cliente'

export function linkWhatsApp(mensagem) {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`
}

// Monta a mensagem do pedido com um ou mais itens (e os dados do cliente para a entrega)
export function mensagemPedido(itens, cliente) {
  const total = itens.reduce((s, i) => s + i.preco * i.quantidade, 0)
  const linhas = itens.map(
    (i, n) =>
      `${n + 1}. *${i.nome}*\n   Cor: ${i.cor} | Tamanho: ${i.tamanho} | Qtd: ${i.quantidade}\n   ${formatarPreco(i.preco)} cada — subtotal ${formatarPreco(i.preco * i.quantidade)}`
  )
  return [
    `Olá! Quero finalizar meu pedido na ${NOME_LOJA}:`,
    '',
    ...linhas,
    '',
    `*Total do pedido: ${formatarPreco(total)}*`,
    ...(cliente
      ? ['', '*Dados para entrega*', `Nome: ${cliente.nome}`, `CEP: ${formatarCep(cliente.cep)}`, `Bairro: ${cliente.bairro}`, `Cidade: ${cliente.cidade} - ${cliente.estado}`]
      : []),
  ].join('\n')
}
