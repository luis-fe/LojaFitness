// Fábrica de rotas HTTP: concentra o que toda rota de API precisa fazer.
//
//   • exige login (e papel) quando pedido — Authorization: Bearer <token>
//   • lê e valida o corpo (JSON ou formulário)
//   • converte o retorno em resposta JSON (ou repassa um Response pronto)
//   • converte erros da aplicação em respostas 4xx; o resto vira 500 sem detalhes internos
//
// Uso dentro de um controller:
//   this.listar = rota(async () => ({ cores: await this.servico.listar() }))
//   this.criar  = rota(async ({ corpo, vendedor }) => Resposta.criado({ cor: ... }), { autenticar: true, corpo: 'json' })
import 'server-only'
import { ErroAplicacao, ErroRequisicao } from '@/server/erros'

export const Resposta = {
  criado: (dados) => Response.json(dados, { status: 201 }),
  semConteudo: () => new Response(null, { status: 204 }),
}

function paraResposta(erro, rotulo) {
  if (erro instanceof ErroAplicacao) {
    const corpo = { erro: erro.message }
    if (erro.campos) corpo.campos = erro.campos
    if (erro.codigo) corpo.codigo = erro.codigo
    if (erro.listaErros) corpo.erros = erro.listaErros // várias mensagens (ex.: linhas do extrato)
    return Response.json(corpo, { status: erro.status, headers: erro.cabecalhos })
  }
  console.error(`[${rotulo}]`, erro)
  return Response.json({ erro: 'Erro interno. Tente novamente.' }, { status: 500 })
}

async function lerCorpo(request, tipo) {
  if (tipo === 'json') {
    try {
      const corpo = await request.json()
      if (corpo && typeof corpo === 'object' && !Array.isArray(corpo)) return corpo
    } catch {
      /* cai no erro abaixo */
    }
    throw new ErroRequisicao('Corpo da requisição inválido (objeto JSON esperado).')
  }
  if (tipo === 'formulario') {
    try {
      return await request.formData()
    } catch {
      throw new ErroRequisicao('Envie o formulário como multipart/form-data.')
    }
  }
  return undefined
}

// autenticador: instância de Autenticador (src/server/http/Autenticador.js)
export function criarRota(autenticador) {
  return function rota(acao, { autenticar = false, papeis, corpo: tipoCorpo, rotulo = 'api' } = {}) {
    return async (request, contexto) => {
      try {
        const params = contexto?.params ? await contexto.params : {}
        const vendedor = autenticar || papeis ? await autenticador.exigir(request, { papeis }) : null
        const corpo = await lerCorpo(request, tipoCorpo)
        const resultado = await acao({ request, params, corpo, vendedor })
        return resultado instanceof Response ? resultado : Response.json(resultado ?? {})
      } catch (erro) {
        return paraResposta(erro, rotulo)
      }
    }
  }
}
