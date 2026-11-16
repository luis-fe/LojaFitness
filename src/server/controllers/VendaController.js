// Registro de Vendas (login)
//   GET  /api/vendas/rascunhos            pedidos em rascunho (situação 0)
//   GET  /api/vendas/:id                  extrato do pedido por SKU
//   POST /api/vendas/:id/aprovar          { linhas: [{ id, quant, preco }] } → Pago (situação 1)
//   DELETE /api/vendas/:id                exclui o pedido em rascunho (e as linhas de vendas_cor_tam)
import 'server-only'
import { Resposta } from '@/server/http/Rota'

export class VendaController {
  constructor({ rota, vendaServico: s }) {
    const logado = { autenticar: true }
    this.rascunhos = rota(async () => ({ pedidos: await s.listarRascunhos() }), { ...logado, rotulo: 'GET /api/vendas/rascunhos' })
    this.extrato = rota(async ({ params }) => ({ pedido: await s.extrato(params.id) }), { ...logado, rotulo: 'GET /api/vendas/:id' })
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
