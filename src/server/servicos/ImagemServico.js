// Regras de negócio das imagens.
//
//   • Aceita JPG, PNG e WEBP até IMAGEM_TAMANHO_MAX_MB (padrão 5 MB).
//   • O tipo é conferido pelo CONTEÚDO do arquivo (sharp), não pelo nome.
//   • Código único, normalizado: "conj calça azul" → "CONJ-CALCA-AZUL".
//   • Vendedor edita/exclui as imagens que enviou; admin, qualquer uma.
import 'server-only'
import sharp from 'sharp'
import { ErroArquivoGrande, ErroConflito, ErroFormato, ErroNaoEncontrado, ErroPermissao, ErroRequisicao, validarOuFalhar } from '@/server/erros'

const FORMATOS = {
  jpeg: { mime: 'image/jpeg', extensao: 'jpg' },
  png: { mime: 'image/png', extensao: 'png' },
  webp: { mime: 'image/webp', extensao: 'webp' },
}

export class ImagemServico {
  constructor({ imagemRepositorio, armazenamento }) {
    this.repo = imagemRepositorio
    this.armazenamento = armazenamento
    this.tamanhoMaxBytes = Math.round(Number(process.env.IMAGEM_TAMANHO_MAX_MB || 5) * 1024 * 1024)
  }

  get tamanhoMaxMb() {
    return (this.tamanhoMaxBytes / 1024 / 1024).toFixed(0)
  }

  static normalizarCodigo(valor) {
    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '-')
      .replace(/[^A-Z0-9._-]/g, '')
      .replace(/-{2,}/g, '-')
  }

  static #validar({ codigo, descricao }, { parcial = false } = {}) {
    const dados = {}
    const erros = {}
    if (!parcial || codigo !== undefined) {
      const c = ImagemServico.normalizarCodigo(codigo)
      if (!/^[A-Z0-9][A-Z0-9._-]{1,59}$/.test(c)) erros.codigo = 'Use de 2 a 60 letras, números, ponto, hífen ou _.'
      else dados.codigo = c
    }
    if (!parcial || descricao !== undefined) {
      const d = String(descricao ?? '').trim()
      if (d.length < 2 || d.length > 200) erros.descricao = 'Informe a descrição (2 a 200 caracteres).'
      else dados.descricao = d
    }
    validarOuFalhar(erros, 'Dados inválidos.')
    return dados
  }

  // Recusa cedo envios muito grandes (pelo cabeçalho Content-Length)
  conferirTamanhoDeclarado(bytes) {
    if (bytes > this.tamanhoMaxBytes + 64 * 1024) {
      throw new ErroArquivoGrande(`A imagem passa do limite de ${this.tamanhoMaxMb} MB.`, { arquivo: `Tamanho máximo: ${this.tamanhoMaxMb} MB.` })
    }
  }

  async listar({ busca = '', pagina = 1, porPagina = 24 } = {}) {
    pagina = Math.max(1, Number.parseInt(pagina, 10) || 1)
    porPagina = Math.min(100, Math.max(1, Number.parseInt(porPagina, 10) || 24))
    const { linhas, total } = await this.repo.listar({ busca, pagina, porPagina })
    return { imagens: linhas, paginacao: { pagina, porPagina, total, totalPaginas: Math.ceil(total / porPagina) } }
  }

  async buscar(id) {
    const imagem = await this.repo.buscarPorId(id)
    if (!imagem) throw new ErroNaoEncontrado('Imagem não encontrada.')
    return imagem
  }

  async criar({ arquivo, codigo, descricao }, autor) {
    const dados = ImagemServico.#validar({ codigo, descricao })

    if (!arquivo || typeof arquivo.arrayBuffer !== 'function' || arquivo.size === 0) {
      validarOuFalhar({ arquivo: 'Selecione uma imagem.' })
    }
    if (arquivo.size > this.tamanhoMaxBytes) {
      throw new ErroArquivoGrande(`A imagem passa do limite de ${this.tamanhoMaxMb} MB.`, { arquivo: `Tamanho máximo: ${this.tamanhoMaxMb} MB.` })
    }

    const conteudo = Buffer.from(await arquivo.arrayBuffer())
    const info = await sharp(conteudo)
      .metadata()
      .catch(() => null)
    const formato = FORMATOS[info?.format]
    if (!formato) throw new ErroFormato('Formato não aceito. Envie JPG, PNG ou WEBP.', { arquivo: 'Envie JPG, PNG ou WEBP.' })

    // Confere o código antes de gravar o arquivo (evita arquivos órfãos)
    if (await this.repo.codigoExiste(dados.codigo)) {
      throw new ErroConflito('Já existe uma imagem com este código.', { codigo: 'Já existe uma imagem com este código.' })
    }

    const nome = await this.armazenamento.salvar(conteudo, formato.extensao)
    try {
      const id = await this.repo.inserir({
        ...dados,
        arquivo: nome,
        tipoMime: formato.mime,
        tamanhoBytes: conteudo.length,
        largura: info.width ?? null,
        altura: info.height ?? null,
        vendedorId: autor.id,
      })
      return this.buscar(id)
    } catch (erro) {
      await this.armazenamento.remover(nome) // não deixa arquivo sem registro
      throw erro
    }
  }

  async #exigirDonoOuAdmin(id, autor) {
    const dono = await this.repo.donoDe(id)
    if (!dono) throw new ErroNaoEncontrado('Imagem não encontrada.')
    if (autor.papel !== 'admin' && dono.vendedorId !== autor.id) throw new ErroPermissao('Você só pode alterar as imagens que enviou.')
  }

  async atualizar(id, entrada, autor) {
    const extras = Object.keys(entrada ?? {}).filter((c) => !['codigo', 'descricao'].includes(c))
    if (extras.length) throw new ErroRequisicao(`Campos não permitidos: ${extras.join(', ')}.`)
    const dados = ImagemServico.#validar(entrada, { parcial: true })
    if (!Object.keys(dados).length) throw new ErroRequisicao('Nenhum campo para atualizar.')
    await this.#exigirDonoOuAdmin(id, autor)
    await this.repo.atualizar(id, dados)
    return this.buscar(id)
  }

  async excluir(id, autor) {
    await this.#exigirDonoOuAdmin(id, autor)
    const arquivo = await this.repo.excluir(id)
    if (arquivo) await this.armazenamento.remover(arquivo)
  }

  // Entrega pública do arquivo (só se estiver registrado no banco)
  async abrirArquivo(nome) {
    const tipo = await this.repo.tipoDoArquivo(nome).catch(() => null)
    if (!tipo) return null
    const arquivo = await this.armazenamento.ler(nome)
    return arquivo && { ...arquivo, tipo }
  }
}
