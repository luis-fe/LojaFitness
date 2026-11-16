// POST /api/visitas — chamado pela loja quando alguém abre o site (público).
// Sempre responde 204: o visitante não precisa saber se a visita foi contada.
import 'server-only'

export class VisitaController {
  constructor({ visitaServico }) {
    this.registrar = async (request) => {
      try {
        await visitaServico.registrar(request)
      } catch (erro) {
        console.error('[POST /api/visitas]', erro.message)
      }
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
    }
  }
}
