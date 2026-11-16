// Registro de visitantes da loja.
//
//   • Guarda log, data/hora e IP na tabela visitantes_log.
//   • O mesmo IP conta no máximo uma vez a cada 30 minutos (evita encher a tabela com recargas).
//   • Robôs de busca e pré-visualizações de link não contam.
//   • Mantém só os últimos 30 dias: a limpeza roda no máximo uma vez por hora, junto com os registros.
import 'server-only'
import { isIP } from 'node:net'

const ROBOS = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|headless|lighthouse/i

export class VisitaServico {
  static DIAS_GUARDADOS = 30
  static INTERVALO_MESMO_IP_MIN = 30
  static LIMPEZA_A_CADA_MS = 60 * 60 * 1000

  constructor({ visitaRepositorio }) {
    this.repo = visitaRepositorio
  }

  // Primeiro IP do X-Forwarded-For (o do visitante, quando há proxy como o do Railway)
  static ipDaRequisicao(request) {
    const encaminhado = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    const candidato = encaminhado || request.headers.get('x-real-ip') || ''
    const ip = candidato.replace(/^::ffff:/, '') // IPv4 escrito no formato IPv6
    return isIP(ip) ? ip : null
  }

  // Devolve { registrado: boolean, motivo? } — nunca lança erro para o visitante
  async registrar(request) {
    const agente = request.headers.get('user-agent') || ''
    if (!agente || ROBOS.test(agente)) return { registrado: false, motivo: 'robo' }

    const ip = VisitaServico.ipDaRequisicao(request)
    if (!ip) return { registrado: false, motivo: 'ip_invalido' }

    const registrado = await this.repo.registrarSeNovo(ip, VisitaServico.INTERVALO_MESMO_IP_MIN)
    await this.#limparSeNecessario()
    return { registrado }
  }

  async #limparSeNecessario() {
    const agora = Date.now()
    if (agora - (globalThis.__jlkUltimaLimpezaVisitas ?? 0) < VisitaServico.LIMPEZA_A_CADA_MS) return
    globalThis.__jlkUltimaLimpezaVisitas = agora
    const apagados = await this.repo.apagarAntigos(VisitaServico.DIAS_GUARDADOS)
    if (apagados) console.log(`[visitas] ${apagados} registro(s) com mais de ${VisitaServico.DIAS_GUARDADOS} dias removido(s)`)
  }
}
