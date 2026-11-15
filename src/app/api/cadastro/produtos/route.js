// /api/cadastro/produtos   (login)
// GET  → { produtos: [{ codigo, nome, preco_atual, campanha_nome, caminho, variacoes, estoque_total, criado_por_nome, criado_em, ... }] }
// POST { codigo, nome, descricao, preco_atual, campanha_id?, caminho?, ativo?, filhos: [{ cor, tamanho, estoque }] }
//      → 201 { produto }   (criado_por = vendedor logado)
import { exigirAutenticacao } from '@/lib/auth'
import { listarProdutos, criarProduto } from '@/lib/cadastroProdutos'
import { lerJson, corpoInvalido, responderErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro
  try {
    return Response.json({ produtos: await listarProdutos() })
  } catch (erro) {
    return responderErro(erro, 'GET /api/cadastro/produtos')
  }
}

export async function POST(request) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro
  const corpo = await lerJson(request)
  if (!corpo) return corpoInvalido()
  try {
    return Response.json({ produto: await criarProduto(corpo, auth.vendedor) }, { status: 201 })
  } catch (erro) {
    return responderErro(erro, 'POST /api/cadastro/produtos')
  }
}
