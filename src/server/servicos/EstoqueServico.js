// Estoque — Produtos → Entradas
//   • Entrada: soma a quantidade no estoque da variação e registra em mov_produto (movimento 'entrada')
//   • As vendas registram a saída (veja VendaRepositorio)
//   • Inventário: ajusta o estoque para a contagem e registra a diferença (tipo 'inventario', + ou −)
import 'server-only'
import { ErroValidacao } from '@/server/erros'

const MAX_QTD = 99999

export class EstoqueServico {
  constructor({ estoqueRepositorio }) {
    this.repo = estoqueRepositorio
  }

  listarProdutos() {
    return this.repo.listarProdutos()
  }

  // entrada: { codigo, itens: [{ cor, tamanho, qtd }] } — linhas com qtd vazia ou 0 são ignoradas
  async registrarEntrada(entrada, vendedor) {
    const codigo = String(entrada?.codigo ?? '').trim().toUpperCase()
    if (!codigo) throw new ErroValidacao({ codigo: 'Escolha o produto.' }, 'Escolha o produto.')
    const lista = (Array.isArray(entrada?.itens) ? entrada.itens : []).filter((i) => i && i.qtd !== '' && i.qtd !== null && Number(i.qtd) !== 0)
    if (!lista.length) throw new ErroValidacao({ itens: 'Informe a entrada de pelo menos uma variação.' }, 'Informe a entrada de pelo menos uma variação.')
    const erros = []
    const vistos = new Set()
    const itens = lista.map((i, n) => {
      const cor = String(i.cor ?? '').trim().toUpperCase()
      const tamanho = String(i.tamanho ?? '').trim().toUpperCase()
      const qtd = Number(i.qtd)
      if (!cor || !tamanho || vistos.has(`${cor}|${tamanho}`)) erros.push(`Linha ${n + 1}: variação inválida.`)
      vistos.add(`${cor}|${tamanho}`)
      if (!Number.isInteger(qtd) || qtd < 1 || qtd > MAX_QTD) erros.push(`${cor} ${tamanho}: entrada deve ser um número inteiro de 1 a ${MAX_QTD}.`)
      return { cor, tamanho, qtd }
    })
    if (erros.length) {
      const e = new ErroValidacao(undefined, erros[0])
      e.listaErros = erros
      throw e
    }
    try {
      await this.repo.registrarEntrada(codigo, itens, vendedor.id)
    } catch (erro) {
      if (erro.message === 'variacao_inexistente') {
        const msgs = erro.inexistentes.map((sku) => `${sku}: variação não existe no cadastro.`)
        const e = new ErroValidacao(undefined, msgs[0])
        e.listaErros = msgs
        throw e
      }
      throw erro
    }
    return { pecas: itens.reduce((s, i) => s + i.qtd, 0), variacoes: itens.length }
  }

  movimentos(codigo) {
    return this.repo.movimentos(String(codigo ?? '').trim().toUpperCase())
  }

  // entrada: { codigo, contagens: [{ cor, tamanho, contado }] } — só as variações contadas (campo vazio = não contou)
  async registrarInventario(entrada, vendedor) {
    const codigo = String(entrada?.codigo ?? '').trim().toUpperCase()
    if (!codigo) throw new ErroValidacao({ codigo: 'Escolha o produto.' }, 'Escolha o produto.')
    const lista = (Array.isArray(entrada?.contagens) ? entrada.contagens : []).filter((c) => c && c.contado !== '' && c.contado !== null && c.contado !== undefined)
    if (!lista.length) throw new ErroValidacao({ contagens: 'Informe a contagem de pelo menos uma variação.' }, 'Informe a contagem de pelo menos uma variação.')
    const erros = []
    const vistos = new Set()
    const contagens = lista.map((c, n) => {
      const cor = String(c.cor ?? '').trim().toUpperCase()
      const tamanho = String(c.tamanho ?? '').trim().toUpperCase()
      const contado = Number(c.contado)
      if (!cor || !tamanho || vistos.has(`${cor}|${tamanho}`)) erros.push(`Linha ${n + 1}: variação inválida.`)
      vistos.add(`${cor}|${tamanho}`)
      if (!Number.isInteger(contado) || contado < 0 || contado > MAX_QTD) erros.push(`${cor} ${tamanho}: contagem deve ser um número inteiro de 0 a ${MAX_QTD}.`)
      return { cor, tamanho, contado }
    })
    if (erros.length) {
      const e = new ErroValidacao(undefined, erros[0])
      e.listaErros = erros
      throw e
    }
    try {
      const ajustes = await this.repo.registrarInventario(codigo, contagens, vendedor.id)
      return {
        ajustes,
        contadas: ajustes.length,
        ajustadas: ajustes.filter((a) => a.diferenca !== 0).length,
        diferenca: ajustes.reduce((s, a) => s + a.diferenca, 0),
      }
    } catch (erro) {
      if (erro.message === 'variacao_inexistente') {
        const msgs = erro.inexistentes.map((sku) => `${sku}: variação não existe no cadastro.`)
        const e = new ErroValidacao(undefined, msgs[0])
        e.listaErros = msgs
        throw e
      }
      throw erro
    }
  }
}
