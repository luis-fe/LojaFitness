// Regras de negócio do cadastro de produtos (pai) e variações (produtos_filho).
//
//   • Código único em maiúsculas; o endereço da página (slug) é gerado a partir dele.
//   • preco_atual com 2 casas (aceita "159,90"); campanha opcional; caminho = imagem do site/volume.
//   • Variações: cor x tamanho únicos por produto, estoque inteiro ≥ 0; salvas junto com o produto.
//   • criado_por = vendedor logado.
//   • Não exclui produto que está no layout do site (link /produto/<slug> no rascunho ou no publicado).
import 'server-only'
import { ErroConflito, ErroNaoEncontrado, ErroRequisicao, validarOuFalhar } from '@/server/erros'
import { MODELOS } from '@/lib/layoutModelos'

const semAcento = (v) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const caminhoValido = (u) =>
  /^\/arquivos\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(u) || /^\/images\/[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$/.test(u)

export class ProdutoServico {
  constructor({ produtoRepositorio, layoutRepositorio }) {
    this.repo = produtoRepositorio
    this.layout = layoutRepositorio
  }

  // Onde o produto aparece no layout: ["camada 1 (Imagem destacada), botão 1", …]
  static usosNoLayout(camadas, slug) {
    const alvo = new RegExp(`(^|[^a-z0-9-])/produto/${slug}(?![a-z0-9-])`, 'i')
    const usos = []
    ;(Array.isArray(camadas) ? camadas : []).forEach((c, i) => {
      const onde = `camada ${i + 1} (${MODELOS[c?.tipo]?.nome ?? c?.tipo})`
      const d = c?.dados ?? {}
      if (alvo.test(d.botaoLink ?? '')) usos.push(`${onde}, botão 1`)
      if (alvo.test(d.botao2Link ?? '')) usos.push(`${onde}, botão 2`)
      ;(d.imagens ?? []).forEach((img, n) => alvo.test(img?.link ?? '') && usos.push(`${onde}, imagem ${n + 1}`))
    })
    return usos
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
    if (veio('preco_anterior')) {
      if (e.preco_anterior === null || e.preco_anterior === '') d.preco_anterior = null
      else {
        const p = ProdutoServico.lerPreco(e.preco_anterior)
        if (!Number.isFinite(p) || p <= 0 || p > 99999999.99) erros.preco_anterior = 'Informe um preço anterior válido (ex.: 199,90).'
        else d.preco_anterior = Math.round(p * 100) / 100
      }
    }
    if (veio('mostrar_preco_anterior')) {
      if (typeof e.mostrar_preco_anterior !== 'boolean') erros.mostrar_preco_anterior = 'Valor inválido.'
      else d.mostrar_preco_anterior = e.mostrar_preco_anterior
    }
    return { d, erros }
  }

  // Efeito X ligado exige preço anterior maior que o preço atual (senão o "de/por" não faz sentido)
  static #validarPrecoAnterior(final, erros) {
    if (!final.mostrar_preco_anterior || erros.preco_anterior || erros.preco_atual) return
    if (final.preco_anterior === null || final.preco_anterior === undefined) erros.preco_anterior = 'Informe o preço anterior para usar o efeito X.'
    else if (Number(final.preco_anterior) <= Number(final.preco_atual)) erros.preco_anterior = 'O preço anterior precisa ser maior que o preço atual.'
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
    ProdutoServico.#validarPrecoAnterior(d, erros)
    validarOuFalhar(erros)
    await this.repo.criar({ ...d, slug: ProdutoServico.slugDoCodigo(d.codigo), criado_por: autor.id }, filhos)
    return this.buscar(d.codigo)
  }

  async atualizar(codigo, entrada) {
    const { d, erros } = ProdutoServico.#validar(entrada ?? {}, { parcial: true })
    const filhos = ProdutoServico.#validarFilhos(entrada?.filhos, erros)
    if (['preco_atual', 'preco_anterior', 'mostrar_preco_anterior'].some((c) => c in d)) {
      const atual = await this.repo.buscar(codigo)
      if (atual) ProdutoServico.#validarPrecoAnterior({ ...atual, ...d }, erros)
    }
    validarOuFalhar(erros)
    if (!Object.keys(d).length && filhos === undefined) throw new ErroRequisicao('Nenhum campo para atualizar.')
    if (d.codigo) d.slug = ProdutoServico.slugDoCodigo(d.codigo)
    if (!(await this.repo.atualizar(codigo, d, filhos))) throw new ErroNaoEncontrado('Produto não encontrado.')
    return this.buscar(d.codigo ?? codigo)
  }

  async excluir(codigo) {
    const produto = await this.repo.buscar(codigo)
    if (!produto) throw new ErroNaoEncontrado('Produto não encontrado.')

    const pagina = await this.layout.buscarEditor('inicio')
    if (pagina) {
      const usos = [
        ...ProdutoServico.usosNoLayout(pagina.publicado, produto.slug).map((u) => `site publicado — ${u}`),
        ...ProdutoServico.usosNoLayout(pagina.rascunho, produto.slug).map((u) => `rascunho — ${u}`),
      ]
      if (usos.length) {
        throw new ErroConflito(
          `O produto ${produto.codigo} está no layout do site e não pode ser excluído. ` +
            `Remova o link em Meu Site (${[...new Set(usos)].join('; ')}) e tente de novo.`
        )
      }
    }
    if (!(await this.repo.excluir(codigo))) throw new ErroNaoEncontrado('Produto não encontrado.')
  }
}
