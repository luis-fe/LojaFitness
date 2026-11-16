// Registro de Vendas (login)
//   GET  /api/vendas/rascunhos            pedidos em rascunho (situação 0)
//   GET  /api/vendas/:id                  extrato do pedido por SKU
//   POST /api/vendas/:id/aprovar          { linhas: [{ id, quant, preco }] } → Pago (situação 1)
//   DELETE /api/vendas/:id                exclui o pedido em rascunho (e as linhas de vendas_cor_tam)
//   GET  /api/vendas/produtos             produtos e variações para o lançamento manual
//   POST /api/vendas/manual               { cliente, itens } → venda gravada como Paga (origem manual)
//   GET  /api/vendas/historico            ?de=AAAA-MM-DD&ate=AAAA-MM-DD&cliente=texto
import 'server-only'
import { Resposta } from '@/server/http/Rota'

export class VendaController {
  constructor({ rota, vendaServico: s }) {
    const logado = { autenticar: true }
    this.rascunhos = rota(async () => ({ pedidos: await s.listarRascunhos() }), { ...logado, rotulo: 'GET /api/vendas/rascunhos' })
    this.extrato = rota(async ({ params }) => ({ pedido: await s.extrato(params.id) }), { ...logado, rotulo: 'GET /api/vendas/:id' })
    this.produtos = rota(async () => ({ produtos: await s.produtosParaVenda() }), { ...logado, rotulo: 'GET /api/vendas/produtos' })
    this.manual = rota(async ({ corpo, vendedor }) => Resposta.criado({ pedido: await s.lancarManual(corpo, vendedor) }), {
      ...logado,
      corpo: 'json',
      rotulo: 'POST /api/vendas/manual',
    })
    this.historico = rota(
      async ({ request }) => {
        const q = new URL(request.url).searchParams
        return s.historico({ de: q.get('de'), ate: q.get('ate'), cliente: q.get('cliente') })
      },
      { ...logado, rotulo: 'GET /api/vendas/historico' }
    )
    this.excluir = rota(
      async ({ params }) => {
        await s.excluirRascunho(params.id)
        return Resposta.semConteudo()
      },
      { ...logado, rotulo: 'DELETE /api/vendas/:id' }
    )
    this.aprovar = rota(async ({ params, corpo, vendedor }) => ({ pedido: await s.aprovar(params.id, corpo, vendedor) }), {
      ...logado,
      corpo: 'json',
      rotulo: 'POST /api/vendas/:id/aprovar',
    })
  }
}
