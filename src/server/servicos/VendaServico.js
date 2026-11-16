// Registro de Vendas — Aprovar Pagamento
//   • Lista os pedidos em Rascunho (situação 0)
//   • Extrato por SKU (vendas_cor_tam): o vendedor pode mudar preço e quantidade e excluir SKUs
//   • Efetivar: grava as mudanças, recalcula o total e o pedido passa a Pago/aprovado (situação 1)
import 'server-only'
import { ErroConflito, ErroNaoEncontrado, ErroValidacao } from '@/server/erros'

const MAX_QUANT = 9999

export class VendaServico {
  constructor({ vendaRepositorio }) {
    this.repo = vendaRepositorio
  }

  static #id(valor) {
    const id = Number(valor)
    if (!Number.isSafeInteger(id) || id < 1) throw new ErroNaoEncontrado('Pedido não encontrado.')
    return id
  }

  listarRascunhos() {
    return this.repo.listarRascunhos()
  }

  async extrato(idPedido) {
    const extrato = await this.repo.buscarExtrato(VendaServico.#id(idPedido))
    if (!extrato) throw new ErroNaoEncontrado('Pedido não encontrado.')
    return extrato
  }

  // entrada: { linhas: [{ id, quant, preco }] } — SKUs que ficam no pedido
  async aprovar(idPedido, entrada, vendedor) {
    const id = VendaServico.#id(idPedido)
    const lista = Array.isArray(entrada?.linhas) ? entrada.linhas : null
    if (!lista) throw new ErroValidacao({ linhas: 'Envie as linhas do extrato.' }, 'Envie as linhas do extrato.')
    if (!lista.length) throw new ErroValidacao({ linhas: 'O pedido precisa de pelo menos 1 SKU para ser aprovado.' }, 'O pedido precisa de pelo menos 1 SKU para ser aprovado.')

    const erros = []
    const vistos = new Set()
    const linhas = lista.map((l, n) => {
      const rotulo = `Linha ${n + 1}`
      const linhaId = Number(l?.id)
      const quant = Number(l?.quant)
      const preco = typeof l?.preco === 'number' ? l.preco : Number(String(l?.preco ?? '').replace(/\./g, '').replace(',', '.'))
      if (!Number.isSafeInteger(linhaId) || linhaId < 1 || vistos.has(linhaId)) erros.push(`${rotulo}: SKU inválido.`)
      vistos.add(linhaId)
      if (!Number.isInteger(quant) || quant < 1 || quant > MAX_QUANT) erros.push(`${rotulo}: quantidade deve ser um número inteiro de 1 a ${MAX_QUANT}.`)
      if (!Number.isFinite(preco) || preco < 0 || preco > 99999999.99) erros.push(`${rotulo}: preço inválido.`)
      return { id: linhaId, quant, preco: Math.round(preco * 100) / 100 }
    })
    if (erros.length) {
      const e = new ErroValidacao(undefined, erros[0])
      e.listaErros = erros
      throw e
    }

    const r = await this.repo.aprovar(id, linhas, vendedor.id)
    if (!r.ok && r.motivo === 'nao_encontrado') throw new ErroNaoEncontrado('Pedido não encontrado.')
    if (!r.ok && r.motivo === 'ja_aprovado') throw new ErroConflito('Este pedido já foi aprovado.')
    if (!r.ok) throw new ErroValidacao(undefined, 'Um dos SKUs não pertence a este pedido. Recarregue o extrato.')
    return r.pedido
  }
}
