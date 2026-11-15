// Regras de negócio das cores.
//   • Código em maiúsculas sem acento (gerado do nome se não vier); RGB guardado como #RRGGBB.
//   • Aceita #RGB, #RRGGBB ou rgb(r, g, b) na entrada.
//   • Não exclui cor usada em variações; trocar o código atualiza as variações (ON UPDATE CASCADE).
import 'server-only'
import { ErroConflito, ErroNaoEncontrado, ErroRequisicao, validarOuFalhar } from '@/server/erros'

export class CorServico {
  constructor({ corRepositorio }) {
    this.repo = corRepositorio
  }

  static normalizarCodigo(v) {
    return String(v ?? '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30)
  }

  // "#abc" | "#AABBCC" | "rgb(74, 127, 216)" → "#4A7FD8"; inválido → null
  static normalizarRgb(valor) {
    const v = String(valor ?? '').trim()
    let m = v.match(/^#?([0-9a-f]{6})$/i)
    if (m) return `#${m[1].toUpperCase()}`
    m = v.match(/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i)
    if (m) return `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}`.toUpperCase()
    m = v.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)
    if (m && m.slice(1).every((n) => Number(n) <= 255)) {
      return `#${m.slice(1).map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase()}`
    }
    return null
  }

  static #validar(e, { parcial }) {
    const dados = {}
    const erros = {}
    if (!parcial || e.nome !== undefined) {
      const n = String(e.nome ?? '').trim()
      if (n.length < 1 || n.length > 40) erros.nome = 'Informe o nome da cor (até 40 caracteres).'
      else dados.nome = n
    }
    if (!parcial || e.codigo !== undefined) {
      const c = CorServico.normalizarCodigo(e.codigo || (!parcial ? e.nome : ''))
      if (!/^[A-Z0-9][A-Z0-9_-]{0,29}$/.test(c)) erros.codigo = 'Código: letras, números e hífen (ex.: VERDE-MILITAR).'
      else dados.codigo = c
    }
    if (!parcial || e.rgb !== undefined) {
      const r = CorServico.normalizarRgb(e.rgb)
      if (!r) erros.rgb = 'Cor RGB inválida. Use #RRGGBB (ex.: #4A7FD8).'
      else dados.rgb = r
    }
    validarOuFalhar(erros)
    return dados
  }

  listar() {
    return this.repo.listar()
  }

  async criar(entrada) {
    const dados = CorServico.#validar(entrada ?? {}, { parcial: false })
    await this.repo.inserir(dados)
    return this.repo.buscar(dados.codigo)
  }

  async atualizar(codigo, entrada) {
    const dados = CorServico.#validar(entrada ?? {}, { parcial: true })
    if (!Object.keys(dados).length) throw new ErroRequisicao('Nenhum campo para atualizar.')
    const codigoFinal = await this.repo.atualizar(codigo, dados)
    if (!codigoFinal) throw new ErroNaoEncontrado('Cor não encontrada.')
    return this.repo.buscar(codigoFinal)
  }

  async excluir(codigo) {
    const uso = await this.repo.contarUso(codigo)
    if (uso) throw new ErroConflito(`Não é possível excluir: a cor ${codigo} está em ${uso} variação(ões) de produtos.`)
    if (!(await this.repo.excluir(codigo))) throw new ErroNaoEncontrado('Cor não encontrada.')
  }
}
