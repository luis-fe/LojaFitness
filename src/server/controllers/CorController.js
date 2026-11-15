// Cores
//   GET    /api/cores             público, por nome
//   POST   /api/cores             { nome, rgb, codigo? }       (login; sem código = gerado do nome)
//   PATCH  /api/cores/:codigo     { codigo?, nome?, rgb? }     (login)
//   DELETE /api/cores/:codigo     recusado se estiver em uso   (login)
import 'server-only'
import { Resposta } from '@/server/http/Rota'

const codigoDe = (params) => decodeURIComponent(params.codigo)

export class CorController {
  constructor({ rota, corServico: s }) {
    const logado = { autenticar: true }
    this.listar = rota(async () => ({ cores: await s.listar() }), { rotulo: 'GET /api/cores' })
    this.criar = rota(async ({ corpo }) => Resposta.criado({ cor: await s.criar(corpo) }), { ...logado, corpo: 'json', rotulo: 'POST /api/cores' })
    this.atualizar = rota(async ({ params, corpo }) => ({ cor: await s.atualizar(codigoDe(params), corpo) }), {
      ...logado,
      corpo: 'json',
      rotulo: 'PATCH /api/cores/:codigo',
    })
    this.excluir = rota(
      async ({ params }) => {
        await s.excluir(codigoDe(params))
        return Resposta.semConteudo()
      },
      { ...logado, rotulo: 'DELETE /api/cores/:codigo' }
    )
  }
}
