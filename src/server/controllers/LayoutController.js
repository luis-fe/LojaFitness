// Layout da página inicial (somente ADMIN)
//   GET  /api/layout            → rascunho, publicado e datas
//   PUT  /api/layout            { camadas } → salva o rascunho (o site não muda)
//   POST /api/layout/publicar   { camadas } → publica na página inicial
import 'server-only'

export class LayoutController {
  constructor({ rota, layoutServico: s }) {
    const admin = { papeis: ['admin'] }
    this.editor = rota(() => s.obterEditor(), { ...admin, rotulo: 'GET /api/layout' })
    this.salvarRascunho = rota(({ corpo, vendedor }) => s.salvarRascunho(corpo.camadas, vendedor), { ...admin, corpo: 'json', rotulo: 'PUT /api/layout' })
    this.publicar = rota(({ corpo, vendedor }) => s.publicar(corpo.camadas, vendedor), { ...admin, corpo: 'json', rotulo: 'POST /api/layout/publicar' })
  }
}
