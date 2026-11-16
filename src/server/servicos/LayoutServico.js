// Layout da página inicial: rascunho (editado no construtor) e publicado (o que os clientes veem).
import 'server-only'
import { ErroValidacao } from '@/server/erros'
import { LAYOUT_PADRAO, produtosDoLayout, validarLayout } from '@/lib/layoutModelos'

const PAGINA = 'inicio'

export class LayoutServico {
  constructor({ layoutRepositorio, catalogoServico }) {
    this.repo = layoutRepositorio
    this.catalogo = catalogoServico
  }

  // Ao salvar/publicar: só imagens de produtos, e cada produto precisa estar à venda (visível na loja)
  async #validar(camadas) {
    const v = validarLayout(camadas, { estrito: true })
    if (!v.ok) throw new ErroValidacao({ camadas: v.erros }, v.erros[0])
    const usados = produtosDoLayout(v.camadas)
    if (usados.length) {
      const aVenda = new Set((await this.catalogo.listar()).map((p) => p.slug))
      const fora = usados.filter((slug) => !aVenda.has(slug))
      if (fora.length) {
        const erros = fora.map((slug) => `O produto "${slug}" não está à venda (oculto ou excluído). Escolha outro produto.`)
        throw new ErroValidacao({ camadas: erros }, erros[0])
      }
    }
    return v.camadas
  }

  // Página inicial: se o banco falhar ou não houver layout, usa o padrão (o site nunca quebra)
  async obterPublicado() {
    try {
      const publicado = await this.repo.buscarPublicado(PAGINA)
      const v = publicado && validarLayout(publicado)
      return v?.ok ? v.camadas : LAYOUT_PADRAO
    } catch (erro) {
      console.error('[layout] usando layout padrão:', erro.message)
      return LAYOUT_PADRAO
    }
  }

  async obterEditor() {
    const r = await this.repo.buscarEditor(PAGINA)
    if (!r) return { rascunho: LAYOUT_PADRAO, publicado: LAYOUT_PADRAO, atualizadoEm: null, publicadoEm: null, padrao: true }
    return {
      rascunho: r.rascunho,
      publicado: r.publicado,
      atualizadoEm: r.atualizado_em,
      publicadoEm: r.publicado_em,
      atualizadoPor: r.atualizado_por,
      publicadoPor: r.publicado_por,
      padrao: false,
    }
  }

  async salvarRascunho(camadas, autor) {
    await this.repo.salvarRascunho(PAGINA, await this.#validar(camadas), LAYOUT_PADRAO, autor.id)
    return this.obterEditor()
  }

  async publicar(camadas, autor) {
    await this.repo.publicar(PAGINA, await this.#validar(camadas), autor.id)
    return this.obterEditor()
  }
}
