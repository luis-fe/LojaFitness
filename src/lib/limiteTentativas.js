// Limite simples de tentativas de login (em memória), contra quem tenta adivinhar senhas.
// Obs.: em hospedagem com várias instâncias (ex.: Vercel), cada instância conta separado;
// para algo mais rígido, mova este controle para o banco ou para um Redis.
import 'server-only'

const JANELA_MS = 15 * 60 * 1000 // 15 minutos
const MAXIMO = 5

const tentativas = globalThis.__jlkTentativas || (globalThis.__jlkTentativas = new Map())

export function verificarLimite(chave) {
  const agora = Date.now()
  const registro = tentativas.get(chave)
  if (!registro || agora - registro.inicio > JANELA_MS) return { bloqueado: false }
  if (registro.falhas >= MAXIMO) {
    return { bloqueado: true, tenteEmSegundos: Math.ceil((registro.inicio + JANELA_MS - agora) / 1000) }
  }
  return { bloqueado: false }
}

export function registrarFalha(chave) {
  const agora = Date.now()
  const registro = tentativas.get(chave)
  if (!registro || agora - registro.inicio > JANELA_MS) tentativas.set(chave, { inicio: agora, falhas: 1 })
  else registro.falhas += 1
}

export function limparFalhas(chave) {
  tentativas.delete(chave)
}
