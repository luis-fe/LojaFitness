// Arquivos enviados (imagens) na pasta UPLOADS_DIR:
//   • no Railway: o volume montado (ex.: /data/imagens) — sobrevive a novos deploys
//   • no seu computador: ./uploads (padrão; está no .gitignore)
//
// Os comentários /*turbopackIgnore*/ avisam o Next que essa pasta só existe em execução
// (sem eles, o build copiaria o projeto inteiro para a imagem de produção).
import 'server-only'
import { mkdir, writeFile, unlink, readFile, stat } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

// Nome gerado pelo servidor: <uuid>.<ext> — nada vindo do usuário entra no caminho
const NOME_VALIDO = /^[0-9a-f-]{36}\.(jpg|png|webp)$/

export class ArmazenamentoServico {
  constructor(pasta = process.env.UPLOADS_DIR) {
    this.pasta = path.resolve(/*turbopackIgnore: true*/ pasta || path.join(/*turbopackIgnore: true*/ process.cwd(), 'uploads'))
  }

  #caminhoSeguro(nome) {
    if (!NOME_VALIDO.test(nome)) return null
    const completo = path.join(/*turbopackIgnore: true*/ this.pasta, nome)
    // Garante que o caminho final continua dentro da pasta (defesa contra "../")
    return completo.startsWith(this.pasta + path.sep) ? completo : null
  }

  async salvar(conteudo, extensao) {
    await mkdir(/*turbopackIgnore: true*/ this.pasta, { recursive: true })
    const nome = `${randomUUID()}.${extensao}`
    await writeFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ this.pasta, nome), conteudo, { flag: 'wx' })
    return nome
  }

  async remover(nome) {
    const caminho = this.#caminhoSeguro(nome)
    if (!caminho) return
    try {
      await unlink(/*turbopackIgnore: true*/ caminho)
    } catch (erro) {
      if (erro.code !== 'ENOENT') throw erro // já não existia: tudo bem
    }
  }

  async ler(nome) {
    const caminho = this.#caminhoSeguro(nome)
    if (!caminho) return null
    try {
      const [conteudo, info] = await Promise.all([readFile(/*turbopackIgnore: true*/ caminho), stat(/*turbopackIgnore: true*/ caminho)])
      return { conteudo, tamanho: info.size }
    } catch (erro) {
      if (erro.code === 'ENOENT') return null
      throw erro
    }
  }
}
