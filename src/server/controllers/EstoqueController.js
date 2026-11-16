// Estoque (login)
//   GET  /api/estoque/produtos                 produtos com variações e estoque atual
//   POST /api/estoque/entradas                 { codigo, itens: [{ cor, tamanho, qtd }] }
//   POST /api/estoque/inventario               { codigo, contagens: [{ cor, tamanho, contado }] }
//   GET  /api/estoque/movimentos?codigo=X      últimas movimentações do produto (mov_produto)
import 'server-only'
import { Resposta } from '@/server/http/Rota'

export class EstoqueController {
  constructor({ rota, estoqueServico: s }) {
    const logado = { autenticar: true }
    this.produtos = rota(async () => ({ produtos: await s.listarProdutos() }), { ...logado, rotulo: 'GET /api/estoque/produtos' })
    this.entrada = rota(async ({ corpo, vendedor }) => Resposta.criado(await s.registrarEntrada(corpo, vendedor)), {
      ...logado,
      corpo: 'json',
      rotulo: 'POST /api/estoque/entradas',
    })
    this.inventario = rota(async ({ corpo, vendedor }) => Resposta.criado(await s.registrarInventario(corpo, vendedor)), {
      ...logado,
      corpo: 'json',
      rotulo: 'POST /api/estoque/inventario',
    })
    this.movimentos = rota(async ({ request }) => ({ movimentos: await s.movimentos(new URL(request.url).searchParams.get('codigo')) }), {
      ...logado,
      rotulo: 'GET /api/estoque/movimentos',
    })
  }
}
