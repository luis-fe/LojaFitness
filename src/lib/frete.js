// Formas de envio (mesmos ids da tabela "frete" do banco — veja db/schema.sql)
export const FRETES = [
  { id: 2, descricao: 'Combinar Frete', detalhe: 'Combinamos o envio e o valor pelo WhatsApp' },
  { id: 1, descricao: 'Retirar c/ vendedor', detalhe: 'Você retira o pedido com o vendedor' },
]

export const FRETE_PADRAO = 2

export const descricaoFrete = (id) => FRETES.find((f) => f.id === Number(id))?.descricao ?? null

// Aceita o id enviado pelo navegador; vazio usa o padrão (Combinar Frete). Devolve null se for inválido.
export function normalizarFrete(valor) {
  if (valor === undefined || valor === null || valor === '') return FRETE_PADRAO
  const id = Number(valor)
  return FRETES.some((f) => f.id === id) ? id : null
}
