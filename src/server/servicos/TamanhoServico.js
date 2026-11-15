// Regras de negócio dos tamanhos.
//   • Código até 6 letras/números em maiúsculas; nome até 40 caracteres; sequência de exibição única.
//   • Não exclui tamanho usado em variações; trocar o código atualiza as variações (ON UPDATE CASCADE).
import 'server-only'
import { ErroConflito, ErroNaoEncontrado, ErroRequisicao, ErroValidacao, validarOuFalhar } from '@/server/erros'

const semAcento = (v) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export class TamanhoServico {
  constructor({ tamanhoRepositorio }) {
    this.repo = tamanhoRepositorio
  }

  static #validar(e, { parcial }) {
    const dados = {}
    const erros = {}
    if (!parcial || e.codigo !== undefined) {
      const c = semAcento(e.codigo).trim().toUpperCase().replace(/\s+/g, '')
      if (!/^[A-Z0-9]{1,6}$/.test(c)) erros.codigo = 'Código: até 6 letras ou números (ex.: P, GG, 38).'
      else dados.codigo = c
    }
    if (!parcial || e.nome !== undefined) {
      const n = String(e.nome ?? '').trim()
      if (n.length < 1 || n.length > 40) erros.nome = 'Informe o nome do tamanho (até 40 caracteres).'
      else dados.nome = n
    }
    if (e.sequencia !== undefined && e.sequencia !== null && e.sequencia !== '') {
      const s = Number(e.sequencia)
      if (!Number.isInteger(s) || s < 1 || s > 999) erros.sequencia = 'Sequência: número inteiro de 1 a 999.'
      else dados.sequencia = s
    }
    validarOuFalhar(erros)
    return dados
  }

  listar() {
    return this.repo.listar()
  }

  async criar(entrada) {
    const dados = TamanhoServico.#validar(entrada ?? {}, { parcial: false })
    await this.repo.inserir(dados)
    return this.repo.buscar(dados.codigo)
  }

  async atualizar(codigo, entrada) {
    const dados = TamanhoServico.#validar(entrada ?? {}, { parcial: true })
    if (!Object.keys(dados).length) throw new ErroRequisicao('Nenhum campo para atualizar.')
    const codigoFinal = await this.repo.atualizar(codigo, dados)
    if (!codigoFinal) throw new ErroNaoEncontrado('Tamanho não encontrado.')
    return this.repo.buscar(codigoFinal)
  }

  async reordenar(codigos) {
    if (!Array.isArray(codigos) || !codigos.length) throw new ErroRequisicao('Envie a lista de códigos na nova ordem.')
    const atuais = (await this.repo.listar()).map((t) => t.codigo)
    if (codigos.length !== atuais.length || !atuais.every((c) => codigos.includes(c))) {
      throw new ErroValidacao({ codigos: 'A lista deve conter todos os tamanhos, cada um uma vez.' })
    }
    await this.repo.reordenar(codigos)
    return this.repo.listar()
  }

  async excluir(codigo) {
    const uso = await this.repo.contarUso(codigo)
    if (uso) throw new ErroConflito(`Não é possível excluir: o tamanho ${codigo} está em ${uso} variação(ões) de produtos.`)
    if (!(await this.repo.excluir(codigo))) throw new ErroNaoEncontrado('Tamanho não encontrado.')
  }
}
