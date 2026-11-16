// Catálogo da loja (site público): monta, a partir do banco, o que a vitrine, a página do
// produto, o carrinho e a conferência do pedido usam.
//
//   produto = { slug, codigo, nome, descricao, imagem, preco, precoOriginal, campanha,
//               cores: [{ codigo, nome, hex }], tamanhos: ['P', 'M', ...],
//               estoque: { [nomeDaCor]: { [tamanho]: quantidade } } }
//
//   • Só entram produtos visíveis (ativo) e as variações que EXISTEM no cadastro:
//     variação excluída some do site; tamanho que não existe para uma cor fica sem chave
//     em estoque[cor] (a página mostra "Não possui"); estoque 0 = "Esgotado".
//   • tamanhos: todos os tamanhos da grade do produto, na sequência de exibição.
import 'server-only'

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
      const original = Number(p.preco_atual ?? 0)
      return {
        slug: p.slug,
        codigo: p.codigo,
        nome: p.nome,
        descricao: p.descricao ?? '',
        imagem: p.caminho || IMAGEM_PADRAO,
        preco,
        precoOriginal: original > preco ? original : null,
        campanha: p.campanha_nome ?? null,
        cores,
        tamanhos: [...tamanhos.entries()].sort((a, b) => a[1] - b[1]).map(([codigo]) => codigo),
        estoque,
      }
    })
  }

  async buscar(slug) {
    return (await this.listar()).find((p) => p.slug === slug) ?? null
  }
}
