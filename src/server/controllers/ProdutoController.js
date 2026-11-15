// Cadastro de produtos (login)
//   GET    /api/cadastro/produtos            lista com campanha, estoque e quem criou
//   POST   /api/cadastro/produtos            { codigo, nome, descricao, preco_atual, campanha_id?, caminho?, ativo?, filhos: [{ cor, tamanho, estoque }] }
//   GET    /api/cadastro/produtos/:codigo    produto + filhos
//   PATCH  /api/cadastro/produtos/:codigo    campos e/ou filhos (a lista enviada substitui as variações)
//   DELETE /api/cadastro/produtos/:codigo    apaga o produto e as variações
import 'server-only'
import { Resposta } from '@/server/http/Rota'

const codigoDe = (params) => decodeURIComponent(params.codigo)

export class ProdutoController {
  constructor({ rota, produtoServico: s }) {
    const logado = { autenticar: true }
    this.listar = rota(async () => ({ produtos: await s.listar() }), { ...logado, rotulo: 'GET /api/cadastro/produtos' })
    this.criar = rota(async ({ corpo, vendedor }) => Resposta.criado({ produto: await s.criar(corpo, vendedor) }), {
      ...logado,
      corpo: 'json',
      rotulo: 'POST /api/cadastro/produtos',
    })
    this.buscar = rota(async ({ params }) => ({ produto: await s.buscar(codigoDe(params)) }), { ...logado, rotulo: 'GET /api/cadastro/produtos/:codigo' })
    this.atualizar = rota(async ({ params, corpo }) => ({ produto: await s.atualizar(codigoDe(params), corpo) }), {
      ...logado,
      corpo: 'json',
      rotulo: 'PATCH /api/cadastro/produtos/:codigo',
    })
    this.excluir = rota(
      async ({ params }) => {
        await s.excluir(codigoDe(params))
        return Resposta.semConteudo()
      },
      { ...logado, rotulo: 'DELETE /api/cadastro/produtos/:codigo' }
    )
  }
}
