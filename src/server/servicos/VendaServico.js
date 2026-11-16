// Registro de Vendas — Aprovar Pagamento
//   • Lista os pedidos em Rascunho (situação 0)
//   • Extrato por SKU (vendas_cor_tam): o vendedor pode mudar preço e quantidade e excluir SKUs
//   • Efetivar: grava as mudanças, recalcula o total e o pedido passa a Pago/aprovado (situação 1)
//   • Lançamento manual: venda feita fora do site, gravada já como Paga (origem manual)
//   • Histórico: vendas pagas filtradas por período e por cliente
import 'server-only'
import { ErroConflito, ErroNaoEncontrado, ErroValidacao, validarOuFalhar } from '@/server/erros'
import { validarCliente } from '@/lib/cliente'
import { cpfCnpjValido } from '@/server/utils/validacao'

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

  async excluirRascunho(idPedido) {
    const r = await this.repo.excluirRascunho(VendaServico.#id(idPedido))
    if (r.ok) return
    if (r.motivo === 'ja_aprovado') throw new ErroConflito('Pedido já aprovado não pode ser excluído.')
    throw new ErroNaoEncontrado('Pedido não encontrado.')
  }

  produtosParaVenda() {
    return this.repo.listarProdutosParaVenda()
  }

  // entrada: { cliente: { nome, cpf_cnpj, cep, bairro, cidade, estado }, itens: [{ codigo, cor, tamanho, quant, preco }] }
  async lancarManual(entrada, vendedor) {
    const { dados: cliente, erros } = validarCliente(entrada?.cliente ?? {})
    const documento = String(entrada?.cliente?.cpf_cnpj ?? '').replace(/\D/g, '')
    if (!cpfCnpjValido(documento)) erros.cpf_cnpj = 'Informe um CNPJ (ou CPF) válido.'
    validarOuFalhar(erros)

    const lista = Array.isArray(entrada?.itens) ? entrada.itens : []
    if (!lista.length) throw new ErroValidacao({ itens: 'Adicione pelo menos 1 produto.' }, 'Adicione pelo menos 1 produto.')
    if (lista.length > 100) throw new ErroValidacao({ itens: 'No máximo 100 itens por venda.' }, 'No máximo 100 itens por venda.')

    // variações que existem no cadastro: "CODIGO|COR|TAM"
    const produtos = await this.repo.listarProdutosParaVenda()
    const existe = new Set(produtos.flatMap((p) => p.variacoes.map((v) => `${p.codigo}|${v.cor}|${v.tamanho}`)))
    const msgs = []
    const vistos = new Set()
    const itens = lista.map((it, n) => {
      const rotulo = `Produto ${n + 1}`
      const codigo = String(it?.codigo ?? '').trim().toUpperCase()
      const cor = String(it?.cor ?? '').trim().toUpperCase()
      const tamanho = String(it?.tamanho ?? '').trim().toUpperCase()
      const quant = Number(it?.quant)
      const preco = typeof it?.preco === 'number' ? it.preco : Number(String(it?.preco ?? '').replace(/\./g, '').replace(',', '.'))
      const chave = `${codigo}|${cor}|${tamanho}`
      if (!existe.has(chave)) msgs.push(`${rotulo}: escolha produto, tamanho e cor do cadastro.`)
      else if (vistos.has(chave)) msgs.push(`${rotulo}: este produto/tamanho/cor já está na venda — some a quantidade na mesma linha.`)
      vistos.add(chave)
      if (!Number.isInteger(quant) || quant < 1 || quant > MAX_QUANT) msgs.push(`${rotulo}: quantidade deve ser um número inteiro de 1 a ${MAX_QUANT}.`)
      if (!Number.isFinite(preco) || preco < 0 || preco > 99999999.99) msgs.push(`${rotulo}: preço unitário inválido.`)
      return { codigo, cor, tamanho, quant, preco: Math.round(preco * 100) / 100 }
    })
    if (msgs.length) {
      const e = new ErroValidacao(undefined, msgs[0])
      e.listaErros = msgs
      throw e
    }
    return this.repo.criarManual({ cliente: { ...cliente, cpf_cnpj: documento }, itens, vendedorId: vendedor.id })
  }

  // filtros: de / ate (AAAA-MM-DD) e cliente (nome, CPF/CNPJ ou CEP)
  async historico({ de, ate, cliente } = {}) {
    const data = (v, campo) => {
      if (!v) return null
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) throw new ErroValidacao({ [campo]: 'Data inválida.' }, 'Data inválida.')
      return v
    }
    const filtros = { de: data(de, 'de'), ate: data(ate, 'ate'), cliente: String(cliente ?? '').trim().slice(0, 80) || null }
    if (filtros.de && filtros.ate && filtros.de > filtros.ate) throw new ErroValidacao({ ate: 'A data final é anterior à inicial.' }, 'A data final é anterior à inicial.')
    const vendas = await this.repo.historico(filtros)
    const total = Math.round(vendas.reduce((s, v) => s + Number(v.total), 0) * 100) / 100
    const pecas = vendas.reduce((s, v) => s + v.pecas, 0)
    return { vendas, resumo: { quantidade: vendas.length, total, pecas } }
  }
}
