// Frete (público)
//   POST /api/frete/simular   { cep, itens: [{ slug, quantidade }] } → opções do Melhor Envio
import 'server-only'

export class FreteController {
  constructor({ rota, freteServico }) {
    this.simular = rota(
      async ({ request, corpo }) => {
        const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local'
        return freteServico.simular(corpo, ip)
      },
      { corpo: 'json', rotulo: 'POST /api/frete/simular' }
    )
  }
}
