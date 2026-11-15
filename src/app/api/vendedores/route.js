// /api/vendedores — gestão de vendedores (somente ADMIN)
//
// GET  /api/vendedores?busca=maria&ativo=true&pagina=1&porPagina=20
//      → { vendedores: [...], paginacao: { pagina, porPagina, total, totalPaginas } }
//
// POST /api/vendedores
//      { "login": "joao", "nome": "João Silva", "senha": "********", "telefone": "(11) 98765-4321",
//        "cpf_cnpj": "123.456.789-09", "nome_fantasia": "JS Modas", "papel": "vendedor" }
//      → 201 { vendedor }
//      cpf_cnpj, nome_fantasia e papel são opcionais.
import { exigirAutenticacao } from '@/lib/auth'
import { listarVendedores, criarVendedor } from '@/lib/vendedores'
import { lerJson, corpoInvalido, responderErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const auth = await exigirAutenticacao(request, { papeis: ['admin'] })
  if (auth.erro) return auth.erro

  const params = new URL(request.url).searchParams
  const ativo = params.get('ativo')
  try {
    const resultado = await listarVendedores({
      busca: params.get('busca') ?? '',
      ativo: ativo === 'true' ? true : ativo === 'false' ? false : undefined,
      pagina: params.get('pagina'),
      porPagina: params.get('porPagina'),
    })
    return Response.json(resultado)
  } catch (erro) {
    return responderErro(erro, 'GET /api/vendedores')
  }
}

export async function POST(request) {
  const auth = await exigirAutenticacao(request, { papeis: ['admin'] })
  if (auth.erro) return auth.erro

  const corpo = await lerJson(request)
  if (!corpo) return corpoInvalido()

  try {
    const vendedor = await criarVendedor(corpo)
    return Response.json({ vendedor }, { status: 201 })
  } catch (erro) {
    return responderErro(erro, 'POST /api/vendedores')
  }
}
