// Hash de senhas com scrypt (nativo do Node.js, sem dependências).
// Formato salvo no banco:  scrypt$N$r$p$saltBase64$hashBase64
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)

const N = 16384 // custo (quanto maior, mais lento para quem tenta adivinhar senhas)
const R = 8
const P = 1
const TAMANHO = 64

export const SENHA_MINIMA = 8

export async function gerarHashSenha(senha) {
  const salt = randomBytes(16)
  const hash = await scrypt(senha.normalize('NFKC'), salt, TAMANHO, { N, r: R, p: P })
  return ['scrypt', N, R, P, salt.toString('base64'), hash.toString('base64')].join('$')
}

export async function conferirSenha(senha, hashSalvo) {
  try {
    const [algoritmo, n, r, p, saltB64, hashB64] = String(hashSalvo).split('$')
    if (algoritmo !== 'scrypt') return false
    const esperado = Buffer.from(hashB64, 'base64')
    const obtido = await scrypt(senha.normalize('NFKC'), Buffer.from(saltB64, 'base64'), esperado.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    })
    // Comparação em tempo constante (não vaza pistas pelo tempo de resposta)
    return timingSafeEqual(obtido, esperado)
  } catch {
    return false
  }
}

// Hash "falso" usado quando o usuário não existe, para a resposta demorar o mesmo tempo
// e ninguém descobrir quais usuários existem medindo o tempo do login.
export const HASH_FICTICIO =
  'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + Buffer.alloc(64).toString('base64')
