// POST /api/pedidos — confere o pedido no servidor e devolve o link do WhatsApp
//
// Corpo esperado:
//   { "itens": [{ "slug": "conjunto-calca", "cor": "Azul", "tamanho": "M", "quantidade": 1 }] }
//
// Resposta 200: { itens, total, mensagem, whatsappUrl }
// Resposta 422: { erros: [...] }  (estoque insuficiente, item inválido etc.)
//
// Próximo passo: salvar o pedido em um banco de dados e gerar a cobrança Pix aqui.
import { validarPedido } from '@/lib/pedidos'

export async function POST(request) {
  let corpo
  try {
    corpo = await request.json()
  } catch {
    return Response.json({ erros: ['Corpo da requisição inválido (JSON esperado).'] }, { status: 400 })
  }

  const resultado = validarPedido(corpo?.itens)
  if (!resultado.ok) {
    return Response.json({ erros: resultado.erros }, { status: 422 })
  }

  const { ok, ...pedido } = resultado
  return Response.json(pedido)
}
