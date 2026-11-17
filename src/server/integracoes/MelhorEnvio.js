// Cliente HTTP da API do Melhor Envio (https://docs.melhorenvio.com.br).
//   Variáveis: MELHORENVIO_API_URL (sandbox ou produção), MELHORENVIO_TOKEN, MELHORENVIO_USER_AGENT.
//   Fluxo da etiqueta: inserirNoCarrinho → comprar (checkout, usa o saldo da carteira) → gerar → imprimir.
//   DACE (impressão da DC-e): só fica pronta alguns minutos depois de gerar a etiqueta.
import 'server-only'

export class ErroMelhorEnvio extends Error {
  constructor(mensagem, status, detalhes) {
    super(mensagem)
    this.status = status
    this.detalhes = detalhes
  }
}

// Junta as mensagens de erro de validação do Melhor Envio num texto legível
function mensagemDe(corpo, status) {
  if (corpo?.errors && typeof corpo.errors === 'object') {
    const msgs = Object.values(corpo.errors).flat().filter(Boolean)
    if (msgs.length) return msgs.join(' ')
  }
  return corpo?.message || corpo?.error || `Melhor Envio respondeu ${status}.`
}

export class MelhorEnvio {
  constructor({ ambiente = process.env, buscar = (...a) => fetch(...a) } = {}) {
    this.env = ambiente
    this.buscar = buscar
  }

  get configurado() {
    return Boolean(this.env.MELHORENVIO_API_URL && this.env.MELHORENVIO_TOKEN)
  }

  get sandbox() {
    return /sandbox/i.test(this.env.MELHORENVIO_API_URL ?? '')
  }

  async #chamar(metodo, caminho, corpo) {
    if (!this.configurado) throw new ErroMelhorEnvio('Melhor Envio não configurado (MELHORENVIO_API_URL / MELHORENVIO_TOKEN).', 503)
    let resposta
    try {
      resposta = await this.buscar(`${this.env.MELHORENVIO_API_URL.replace(/\/+$/, '')}${caminho}`, {
        method: metodo,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.env.MELHORENVIO_TOKEN}`,
          'User-Agent': this.env.MELHORENVIO_USER_AGENT || 'Loja',
        },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        signal: AbortSignal.timeout(30000),
      })
    } catch (erro) {
      throw new ErroMelhorEnvio(`Sem resposta do Melhor Envio (${erro?.name ?? 'erro de rede'}).`, 502)
    }
    const dados = await resposta.json().catch(() => null)
    if (!resposta.ok) throw new ErroMelhorEnvio(mensagemDe(dados, resposta.status), resposta.status, dados)
    return dados
  }

  cotar(corpo) {
    return this.#chamar('POST', '/api/v2/me/shipment/calculate', corpo)
  }

  // → { id, protocol, price, ... }
  inserirNoCarrinho(envio) {
    return this.#chamar('POST', '/api/v2/me/cart', envio)
  }

  // Paga as etiquetas com o saldo da carteira do Melhor Envio
  comprar(ids) {
    return this.#chamar('POST', '/api/v2/me/shipment/checkout', { orders: ids })
  }

  async gerar(ids) {
    const r = await this.#chamar('POST', '/api/v2/me/shipment/generate', { orders: ids })
    const falha = ids.map((id) => r?.[id]).find((x) => x && x.status === false)
    if (falha) throw new ErroMelhorEnvio(falha.message || 'Melhor Envio não gerou a etiqueta.', 422, r)
    return r
  }

  // Link público (não exige login no Melhor Envio) com as etiquetas para imprimir
  async imprimir(ids) {
    const r = await this.#chamar('POST', '/api/v2/me/shipment/print', { mode: 'public', orders: ids })
    return r?.url ?? null
  }

  // Link do PDF da DACE (Documento Auxiliar da DC-e) de uma etiqueta
  async dace(id) {
    const r = await this.#chamar('GET', `/api/v2/me/imprimir/dace/pdf/${encodeURIComponent(id)}`)
    return r?.pdf ?? r?.url ?? Object.values(r ?? {}).find((v) => typeof v === 'string' && v.startsWith('http')) ?? null
  }
}
