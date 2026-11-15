// POST /api/auth/login   { login, senha } → { token, tipo: 'Bearer', expiraEm, expiraEmSegundos, vendedor }
// GET  /api/auth/eu      → { vendedor }  (Authorization: Bearer <token>)
import 'server-only'

export class AuthController {
  constructor({ rota, authServico }) {
    this.entrar = rota(
      async ({ request, corpo }) => {
        const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local'
        // Aceita "login" (e "usuario", por compatibilidade)
        const sessao = await authServico.entrar({ login: corpo.login ?? corpo.usuario, senha: corpo.senha }, ip)
        return Response.json(sessao, { headers: { 'Cache-Control': 'no-store' } })
      },
      { corpo: 'json', rotulo: 'POST /api/auth/login' }
    )

    this.eu = rota(async ({ vendedor }) => ({ vendedor }), { autenticar: true, rotulo: 'GET /api/auth/eu' })
  }
}
