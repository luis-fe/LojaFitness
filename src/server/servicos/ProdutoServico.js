// Regras de negócio do cadastro de produtos (pai) e variações (produtos_filho).
//
//   • Código único em maiúsculas; o endereço da página (slug) é gerado a partir dele.
//   • preco_atual com 2 casas (aceita "159,90"); campanha opcional; caminho = imagem do site/volume.
//   • Variações: cor x tamanho únicos por produto, estoque inteiro ≥ 0; salvas junto com o produto.
//   • criado_por = vendedor logado.
import 'server-only'
import { ErroNaoEncontrado, ErroRequisicao, validarOuFalhar } from '@/server/erros'

const semAcento = (v) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const caminhoValido = (u) =>
  /^\/arquivos\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(u) || /^\/images\/[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$/.test(u)

export class ProdutoServico {
  constructor({ produtoRepositorio }) {
    this.repo = produtoRepositorio
  }

  static normalizarCodigo(v) {
    return semAcento(v)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '-')
      .replace(/[^A-Z0-9._-]/g, '')
      .replace(/-{2,}/g, '-')
  }

  static slugDoCodigo(codigo) {
    return codigo.toLowerCase().replace(/[._]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '')
  }

  // "R$ 1.234,56" | "159,90" | 159.9 → 159.9
  static lerPreco(v) {
    if (typeof v === 'number') return v
    let t = String(v ?? '').replace(/[R$\s]/g, '')
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
    return t === '' ? NaN : Number(t)
  }

  static #validar(e, { parcial }) {
    const d = {}
    const erros = {}
    const veio = (c) => e[c] !== undefined

    if (!parcial || veio('codigo')) {
      const c = ProdutoServico.normalizarCodigo(e.codigo)
      if (!/^[A-Z0-9][A-Z0-9._-]{1,59}$/.test(c)) erros.codigo = 'Código: de 2 a 60 letras, números, ponto, hífen ou _.'
      else d.codigo = c
    }
    if (!parcial || veio('nome')) {
      const n = String(e.nome ?? '').trim()
      if (n.length < 2 || n.length > 120) erros.nome = 'Informe o nome (2 a 120 caracteres).'
      else d.nome = n
    }
    if (!parcial || veio('descricao')) {
      const t = String(e.descricao ?? '').trim()
      if (t.length > 2000) erros.descricao = 'Descrição muito longa (máximo 2000 caracteres).'
      else d.descricao = t
    }
    if (!parcial || veio('preco_atual')) {
      const p = ProdutoServico.lerPreco(e.preco_atual)
      if (!Number.isFinite(p) || p < 0 || p > 99999999.99) erros.preco_atual = 'Informe um preço válido (ex.: 159,90).'
      else d.preco_atual = Math.round(p * 100) / 100
    }
    if (veio('campanha_id')) {
      if (e.campanha_id === null || e.campanha_id === '') d.campanha_id = null
      else if (!Number.isSafeInteger(Number(e.campanha_id)) || Number(e.campanha_id) < 1) erros.campanha_id = 'Campanha inválida.'
      else d.campanha_id = Number(e.campanha_id)
    }
    if (veio('caminho')) {
      if (!e.caminho) d.caminho = null
      else if (!caminhoValido(e.caminho)) erros.caminho = 'Escolha uma imagem enviada pelo site.'
      else d.caminho = e.caminho
    }
    if (veio('ativo')) {
      if (typeof e.ativo !== 'boolean') erros.ativo = 'Ativo deve ser verdadeiro ou falso.'
      else d.ativo = e.ativo
    }
    return { d, erros }
  }

  // [{ cor, tamanho, estoque }] — combinação cor+tamanho única. undefined = não mexer nas variações.
  static #validarFilhos(lista, erros) {
    if (lista === undefined) return undefined
    if (!Array.isArray(lista)) {
      erros.filhos = 'Variações inválidas.'
      return undefined
    }
    if (lista.length > 200) erros.filhos = 'No máximo 200 variações por produto.'
    const vistos = new Set()
    const saida = []
    lista.slice(0, 200).forEach((f, i) => {
      const cor = String(f?.cor ?? '').trim().toUpperCase()
      const tamanho = String(f?.tamanho ?? '').trim().toUpperCase()
      const estoque = Number(f?.estoque ?? 0)
      if (!cor || !tamanho) return void (erros.filhos = `Variação ${i + 1}: escolha a cor e o tamanho.`)
      if (!Number.isInteger(estoque) || estoque < 0 || estoque > 1000000) {
        return void (erros.filhos = `Variação ${i + 1}: estoque deve ser um número inteiro a partir de 0.`)
      }
      const chave = `${cor}|${tamanho}`
      if (vistos.has(chave)) return void (erros.filhos = `Variação repetida: ${cor} / ${tamanho}.`)
      vistos.add(chave)
      saida.push({ cor, tamanho, estoque })
    })
    return saida
  }

  listar() {
    return this.repo.listar()
  }

  async buscar(codigo) {
    const produto = await this.repo.buscar(codigo)
    if (!produto) throw new ErroNaoEncontrado('Produto não encontrado.')
    return { ...produto, filhos: await this.repo.listarFilhos(codigo) }
  }

  async criar(entrada, autor) {
    const { d, erros } = ProdutoServico.#validar(entrada ?? {}, { parcial: false })
    const filhos = ProdutoServico.#validarFilhos(entrada?.filhos ?? [], erros)
    validarOuFalhar(erros)
    await this.repo.criar({ ...d, slug: ProdutoServico.slugDoCodigo(d.codigo), criado_por: autor.id }, filhos)
    return this.buscar(d.codigo)
  }

  async atualizar(codigo, entrada) {
    const { d, erros } = ProdutoServico.#validar(entrada ?? {}, { parcial: true })
    const filhos = ProdutoServico.#validarFilhos(entrada?.filhos, erros)
    validarOuFalhar(erros)
    if (!Object.keys(d).length && filhos === undefined) throw new ErroRequisicao('Nenhum campo para atualizar.')
    if (d.codigo) d.slug = ProdutoServico.slugDoCodigo(d.codigo)
    if (!(await this.repo.atualizar(codigo, d, filhos))) throw new ErroNaoEncontrado('Produto não encontrado.')
    return this.buscar(d.codigo ?? codigo)
  }

  async excluir(codigo) {
    if (!(await this.repo.excluir(codigo))) throw new ErroNaoEncontrado('Produto não encontrado.')
  }
}
