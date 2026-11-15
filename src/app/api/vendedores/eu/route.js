// /api/vendedores/eu — atalho para o cadastro do vendedor logado
//
// GET    → { vendedor }
// PATCH  → { vendedor }   campos permitidos: nome, telefone, cpf_cnpj, nome_fantasia
import { exigirAutenticacao } from '@/lib/auth'
import { buscarVendedor, atualizarVendedor } from '@/lib/vendedores'
import { lerJson, corpoInvalido, responderErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro
  try {
    return Response.json({ vendedor: await buscarVendedor(auth.vendedor.id) })
  } catch (erro) {
    return responderErro(erro, 'GET /api/vendedores/eu')
  }
}

export async function PATCH(request) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro

  const corpo = await lerJson(request)
  if (!corpo) return corpoInvalido()

  // Mesmo sendo admin, por esta rota só se altera o próprio perfil (sem papel/ativo/login)
  const permitidos = ['nome', 'telefone', 'cpf_cnpj', 'nome_fantasia']
  const extras = Object.keys(corpo).filter((c) => !permitidos.includes(c))
  if (extras.length) {
    return Response.json({ erro: `Campos não permitidos aqui: ${extras.join(', ')}.` }, { status: 400 })
  }

  try {
    return Response.json({ vendedor: await atualizarVendedor(auth.vendedor.id, corpo, auth.vendedor) })
  } catch (erro) {
    return responderErro(erro, 'PATCH /api/vendedores/eu')
  }
}
