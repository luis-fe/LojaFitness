// /api/imagens — imagens da loja (exige login)
//
// GET  /api/imagens?busca=calca&pagina=1&porPagina=24
//      → { imagens: [{ id, codigo, descricao, url, largura, altura, tamanho_bytes, ... }], paginacao }
//
// POST /api/imagens   (multipart/form-data)
//      campos: arquivo (JPG/PNG/WEBP, até 5 MB), codigo, descricao
//      → 201 { imagem }
import { exigirAutenticacao } from '@/lib/auth'
import { listarImagens, criarImagem, TAMANHO_MAX_BYTES } from '@/lib/imagens'
import { responderErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro

  const params = new URL(request.url).searchParams
  try {
    return Response.json(
      await listarImagens({
        busca: params.get('busca') ?? '',
        pagina: params.get('pagina'),
        porPagina: params.get('porPagina'),
      })
    )
  } catch (erro) {
    return responderErro(erro, 'GET /api/imagens')
  }
}

export async function POST(request) {
  const auth = await exigirAutenticacao(request)
  if (auth.erro) return auth.erro

  // Recusa cedo envios muito grandes (antes de ler o corpo inteiro)
  const tamanhoDeclarado = Number(request.headers.get('content-length') || 0)
  if (tamanhoDeclarado > TAMANHO_MAX_BYTES + 64 * 1024) {
    const mb = (TAMANHO_MAX_BYTES / 1024 / 1024).toFixed(0)
    return Response.json({ erro: `A imagem passa do limite de ${mb} MB.`, campos: { arquivo: `Tamanho máximo: ${mb} MB.` } }, { status: 413 })
  }

  let formulario
  try {
    formulario = await request.formData()
  } catch {
    return Response.json({ erro: 'Envie o formulário como multipart/form-data.' }, { status: 400 })
  }

  try {
    const imagem = await criarImagem(
      {
        arquivo: formulario.get('arquivo'),
        codigo: formulario.get('codigo'),
        descricao: formulario.get('descricao'),
      },
      auth.vendedor
    )
    return Response.json({ imagem }, { status: 201 })
  } catch (erro) {
    return responderErro(erro, 'POST /api/imagens')
  }
}
