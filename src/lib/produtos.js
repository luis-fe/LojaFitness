// Utilitários da loja usados no navegador e no servidor.
// Os produtos, cores, tamanhos, preços e estoque vêm do banco (Área do Vendedor → Produtos);
// veja src/server/servicos/CatalogoServico.js.

// Abaixo desta quantidade, o estoque aparece como "Últimas unidades"
export const ESTOQUE_BAIXO = 3

export const formatarPreco = (valor) => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Situação de uma cor × tamanho na grade do produto
//   'nao-possui' → a variação não existe no cadastro · 'esgotado' → existe com estoque 0
export function situacaoVariacao(produto, cor, tamanho) {
  const q = produto?.estoque?.[cor]?.[tamanho]
  if (q === undefined) return { situacao: 'nao-possui', quantidade: 0 }
  if (q <= 0) return { situacao: 'esgotado', quantidade: 0 }
  return { situacao: q <= ESTOQUE_BAIXO ? 'baixo' : 'disponivel', quantidade: q }
}
