// Tamanhos
//   GET    /api/tamanhos                 público, na sequência de exibição
//   POST   /api/tamanhos                 { codigo, nome, sequencia? }      (login)
//   PATCH  /api/tamanhos/:codigo         { codigo?, nome?, sequencia? }    (login)
//   DELETE /api/tamanhos/:codigo         recusado se estiver em uso       (login)
//   PUT    /api/tamanhos/ordem           { codigos: [...] } nova sequência (login)
import 'server-only'
import { Resposta } from '@/server/http/Rota'

const codigoDe = (params) => decodeURIComponent(params.codigo)

export class TamanhoController {
  constructor({ rota, tamanhoServico: s }) {
    const logado = { autenticar: true }
    this.listar = rota(async () => ({ tamanhos: await s.listar() }), { rotulo: 'GET /api/tamanhos' })
    this.criar = rota(async ({ corpo }) => Resposta.criado({ tamanho: await s.criar(corpo) }), { ...logado, corpo: 'json', rotulo: 'POST /api/tamanhos' })
    this.atualizar = rota(async ({ params, corpo }) => ({ tamanho: await s.atualizar(codigoDe(params), corpo) }), {
      ...logado,
      corpo: 'json',
      rotulo: 'PATCH /api/tamanhos/:codigo',
    })
    this.excluir = rota(
      async ({ params }) => {
        await s.excluir(codigoDe(params))
        return Resposta.semConteudo()
      },
      { ...logado, rotulo: 'DELETE /api/tamanhos/:codigo' }
    )
    this.reordenar = rota(async ({ corpo }) => ({ tamanhos: await s.reordenar(corpo.codigos) }), { ...logado, corpo: 'json', rotulo: 'PUT /api/tamanhos/ordem' })
  }
}
