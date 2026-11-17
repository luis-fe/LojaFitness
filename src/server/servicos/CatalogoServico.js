// Catálogo da loja (site público): monta, a partir do banco, o que a vitrine, a página do
// produto, o carrinho e a conferência do pedido usam.
//
//   produto = { slug, codigo, nome, descricao, imagem, preco, precoAnterior, campanha,
//               cores: [{ codigo, nome, hex }], tamanhos: ['P', 'M', ...],
//               estoque: { [nomeDaCor]: { [tamanho]: quantidade } } }
//
//   • Só entram produtos visíveis (ativo) e as variações que EXISTEM no cadastro:
//     variação excluída some do site; tamanho que não existe para uma cor fica sem chave
//     em estoque[cor] (a página mostra "Não possui"); estoque 0 = "Esgotado".
//   • tamanhos: todos os tamanhos da grade do produto, na sequência de exibição.
//   • precoAnterior: só quando o efeito X está ligado e o valor é maior que o preço ("de X por Y").
import 'server-only'
import { slugDoSelo, TIPO_SELO_PADRAO } from '@/lib/selos'

const IMAGEM_PADRAO = '/images/hero-conjunto.jpg'

export class CatalogoServico {
  constructor({ produtoRepositorio }) {
    this.repo = produtoRepositorio
  }

  async listar() {
    const { produtos, variacoes } = await this.repo.listarCatalogo()
    const porProduto = new Map()
    for (const v of variacoes) {
      if (!porProduto.has(v.codigo_produto)) porProduto.set(v.codigo_produto, [])
      porProduto.get(v.codigo_produto).push(v)
    }

    return produtos.map((p) => {
      const lista = porProduto.get(p.codigo) ?? []
      const cores = []
      const tamanhos = new Map() // codigo → sequencia
      const estoque = {}
      for (const v of lista) {
        if (!estoque[v.cor_nome]) {
          estoque[v.cor_nome] = {}
          cores.push({ codigo: v.cor, nome: v.cor_nome, hex: v.rgb })
        }
        estoque[v.cor_nome][v.tamanho] = Number(v.estoque)
        tamanhos.set(v.tamanho, v.sequencia)
      }
      const preco = Number(p.preco_final ?? p.preco_atual ?? 0)
      const anterior = p.mostrar_preco_anterior && p.preco_anterior !== null ? Number(p.preco_anterior) : null
      return {
        slug: p.slug,
        codigo: p.codigo,
        nome: p.nome,
        descricao: p.descricao ?? '',
        imagem: p.caminho || IMAGEM_PADRAO,
        preco,
        precoAnterior: anterior > preco ? anterior : null,
        campanha: p.campanha_nome ?? null,
        selo: p.selo_campanha ?? null,
        seloSlug: p.selo_campanha ? slugDoSelo(p.selo_campanha) : null,
        seloTipo: p.selo_campanha ? (p.selo_tipo ?? TIPO_SELO_PADRAO) : null, // 'categoria' | 'campanha'
        calculaFrete: Boolean(p.calcula_frete), // mostra o "Simular frete" na compra
        cores,
        tamanhos: [...tamanhos.entries()].sort((a, b) => a[1] - b[1]).map(([codigo]) => codigo),
        estoque,
      }
    })
  }

  // Selos dos produtos à venda: [{ nome, slug, tipo, quantidade }] — viram itens do menu lateral,
  // separados em Categorias e Campanhas
  async listarSelos() {
    const selos = new Map()
    for (const p of await this.listar()) {
      if (!p.seloSlug) continue
      const s = selos.get(p.seloSlug) ?? { nome: p.selo, slug: p.seloSlug, tipo: p.seloTipo, quantidade: 0 }
      s.quantidade++
      selos.set(p.seloSlug, s)
    }
    return [...selos.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }

  async listarPorSelo(seloSlug) {
    return (await this.listar()).filter((p) => p.seloSlug === seloSlug)
  }

  async buscar(slug) {
    return (await this.listar()).find((p) => p.slug === slug) ?? null
  }
}
