// Respostas padronizadas das APIs — somente no servidor.
import 'server-only'
import { ErroVendedor } from '@/lib/vendedores'

// Lê o corpo JSON; devolve null se vier inválido
export async function lerJson(request) {
  try {
    const corpo = await request.json()
    return corpo && typeof corpo === 'object' && !Array.isArray(corpo) ? corpo : null
  } catch {
    return null
  }
}

export const corpoInvalido = () =>
  Response.json({ erro: 'Corpo da requisição inválido (objeto JSON esperado).' }, { status: 400 })

// Converte ids da URL ("12") em número; null se inválido
export function lerId(valor) {
  const id = Number(valor)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export const idInvalido = () => Response.json({ erro: 'Id inválido.' }, { status: 400 })

// Erros de regra viram 4xx com mensagem; o resto vira 500 sem detalhes internos
export function responderErro(erro, contexto) {
  if (erro instanceof ErroVendedor) {
    return Response.json({ erro: erro.message, ...(erro.campos ? { campos: erro.campos } : {}) }, { status: erro.status })
  }
  console.error(`[${contexto}]`, erro)
  return Response.json({ erro: 'Erro interno. Tente novamente.' }, { status: 500 })
}
