// Formas de envio (mesmos ids da tabela "frete" do banco — veja db/schema.sql)
//   3 = Receber em casa: o cliente escolhe a transportadora (cotação do Melhor Envio) e a loja gera a etiqueta.
//       Só aparece quando o pedido tem produtos com "calcula frete" ligado.
export const FRETE_RETIRAR = 1
export const FRETE_COMBINAR = 2
export const FRETE_TRANSPORTADORA = 3

export const FRETES = [
  { id: FRETE_COMBINAR, descricao: 'Combinar Frete', detalhe: 'Combinamos o envio e o valor pelo WhatsApp' },
  { id: FRETE_RETIRAR, descricao: 'Retirar c/ vendedor', detalhe: 'Você retira o pedido com o vendedor' },
  { id: FRETE_TRANSPORTADORA, descricao: 'Receber em casa', detalhe: 'Correios ou transportadora, com frete calculado pelo CEP', calculado: true },
]

export const FRETE_PADRAO = FRETE_COMBINAR

export const descricaoFrete = (id) => FRETES.find((f) => f.id === Number(id))?.descricao ?? null

// Aceita o id enviado pelo navegador; vazio usa o padrão (Combinar Frete). Devolve null se for inválido.
export function normalizarFrete(valor) {
  if (valor === undefined || valor === null || valor === '') return FRETE_PADRAO
  const id = Number(valor)
  return FRETES.some((f) => f.id === id) ? id : null
}
