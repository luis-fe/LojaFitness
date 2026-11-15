// Formato público de um produto nas respostas da API
export function produtoPublico(p) {
  return {
    slug: p.slug,
    nome: p.nome,
    descricao: p.descricao,
    preco: p.preco,
    imagem: p.imagem.src,
    cores: p.cores,
    estoque: p.estoque,
  }
}
