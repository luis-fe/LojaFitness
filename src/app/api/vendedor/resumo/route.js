// GET /api/vendedor/resumo — números da loja para a Área do Vendedor (PROTEGIDA)
// Cabeçalho obrigatório: Authorization: Bearer <token>
import { exigirAutenticacao } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

const ESTOQUE_BAIXO = 3

export async function GET(request) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro

  try {
    const [produtos, baixo, pedidos] = await Promise.all([
      query(`SELECT count(*) FILTER (WHERE ativo) AS ativos,
                    (SELECT COALESCE(sum(estoque), 0) FROM produtos_filho) AS pecas
             FROM produtos`),
      query(
        `SELECT p.nome, v.cor, v.tamanho, v.estoque
         FROM produtos_filho v
         JOIN produtos p ON p.codigo = v.codigo_produto
         WHERE p.ativo AND v.estoque <= $1
         ORDER BY v.estoque, p.nome, v.cor, v.tamanho`,
        [ESTOQUE_BAIXO]
      ),
      query(`SELECT count(*) FILTER (WHERE status = 'aguardando_pagamento') AS aguardando FROM pedidos`),
    ])

    return Response.json({
      produtosAtivos: produtos.rows[0].ativos,
      pecasDisponiveis: produtos.rows[0].pecas,
      pedidosAguardando: pedidos.rows[0].aguardando,
      estoqueBaixo: baixo.rows,
    })
  } catch (erro) {
    console.error('[api/vendedor/resumo]', erro.message)
    return Response.json({ erro: 'Não foi possível carregar o resumo.' }, { status: 500 })
  }
}
