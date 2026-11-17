// Minha Empresa
//   GET /api/empresa   dados da empresa (login)        → { empresa: {...} | null }
//   PUT /api/empresa   grava os dados (somente admin)  → { empresa: {...} }
import 'server-only'

export class EmpresaController {
  constructor({ rota, empresaServico: s }) {
    this.buscar = rota(async () => ({ empresa: await s.buscar() }), { autenticar: true, rotulo: 'GET /api/empresa' })
    this.salvar = rota(async ({ corpo, vendedor }) => ({ empresa: await s.salvar(corpo, vendedor) }), {
      autenticar: true,
      papeis: ['admin'],
      corpo: 'json',
      rotulo: 'PUT /api/empresa',
    })
  }
}
