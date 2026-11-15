// Limite de tentativas (em memória), usado no login contra quem tenta adivinhar senhas.
// Obs.: com várias instâncias do servidor, cada uma conta separado; para algo mais rígido,
// mova este controle para o banco ou para um Redis.
import 'server-only'

export class LimiteTentativas {
  #registros

  constructor({ maximo = 5, janelaMs = 15 * 60 * 1000, nome = 'padrao' } = {}) {
    this.maximo = maximo
    this.janelaMs = janelaMs
    // Mantém o estado entre recargas do `next dev`
    globalThis.__jlkLimites ??= {}
    this.#registros = globalThis.__jlkLimites[nome] ??= new Map()
  }

  verificar(chave) {
    const agora = Date.now()
    const r = this.#registros.get(chave)
    if (!r || agora - r.inicio > this.janelaMs) return { bloqueado: false }
    if (r.falhas >= this.maximo) return { bloqueado: true, tenteEmSegundos: Math.ceil((r.inicio + this.janelaMs - agora) / 1000) }
    return { bloqueado: false }
  }

  registrarFalha(chave) {
    const agora = Date.now()
    const r = this.#registros.get(chave)
    if (!r || agora - r.inicio > this.janelaMs) this.#registros.set(chave, { inicio: agora, falhas: 1 })
    else r.falhas += 1
  }

  limpar(chave) {
    this.#registros.delete(chave)
  }
}
