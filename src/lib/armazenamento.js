// Armazenamento de arquivos enviados (imagens) — somente no servidor.
//
// Os comentários /*turbopackIgnore*/ avisam o Next que essa pasta só existe em execução
// (sem eles, o build copiaria o projeto inteiro para a imagem de produção).
//
// Os arquivos ficam na pasta UPLOADS_DIR:
//   • no Railway: o volume montado (ex.: /data/imagens) — sobrevive a novos deploys
//   • no seu computador: ./uploads (padrão; já está no .gitignore)
import 'server-only'
import { mkdir, writeFile, unlink, readFile, stat } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

export const PASTA_UPLOADS = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOADS_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), 'uploads'))

// Nome gerado pelo servidor: <uuid>.<ext> — nada vindo do usuário entra no caminho
const NOME_VALIDO = /^[0-9a-f-]{36}\.(jpg|png|webp)$/

function caminhoSeguro(nome) {
  if (!NOME_VALIDO.test(nome)) return null
  const completo = path.join(/*turbopackIgnore: true*/ PASTA_UPLOADS, nome)
  // Garante que o caminho final continua dentro da pasta (defesa contra "../")
  return completo.startsWith(PASTA_UPLOADS + path.sep) ? completo : null
}

export async function salvarArquivo(conteudo, extensao) {
  await mkdir(/*turbopackIgnore: true*/ PASTA_UPLOADS, { recursive: true })
  const nome = `${randomUUID()}.${extensao}`
  await writeFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ PASTA_UPLOADS, nome), conteudo, { flag: 'wx' })
  return nome
}

export async function removerArquivo(nome) {
  const caminho = caminhoSeguro(nome)
  if (!caminho) return
  try {
    await unlink(/*turbopackIgnore: true*/ caminho)
  } catch (erro) {
    if (erro.code !== 'ENOENT') throw erro // já não existia: tudo bem
  }
}

export async function lerArquivo(nome) {
  const caminho = caminhoSeguro(nome)
  if (!caminho) return null
  try {
    const [conteudo, info] = await Promise.all([readFile(/*turbopackIgnore: true*/ caminho), stat(/*turbopackIgnore: true*/ caminho)])
    return { conteudo, tamanho: info.size, modificadoEm: info.mtime }
  } catch (erro) {
    if (erro.code === 'ENOENT') return null
    throw erro
  }
}
