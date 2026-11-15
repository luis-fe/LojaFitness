// Rotas de vendedores. Admin gerencia todos; cada vendedor o próprio cadastro.
//
//   GET/POST          /api/vendedores                (admin)
//   GET/PATCH/DELETE  /api/vendedores/:id            (admin ou o próprio; DELETE = desativar, só admin)
//   PUT               /api/vendedores/:id/senha
//   GET/PATCH         /api/vendedores/eu             (meu cadastro)
//   PUT               /api/vendedores/eu/senha       (minha senha; exige a atual)
import 'server-only'
import { Resposta } from '@/server/http/Rota'
import { ErroRequisicao } from '@/server/erros'

const lerId = (valor) => {
  const id = Number(valor)
  if (!Number.isSafeInteger(id) || id < 1) throw new ErroRequisicao('Id inválido.')
  return id
}

export class VendedorController {
  constructor({ rota, vendedorServico: s }) {
    const admin = { papeis: ['admin'] }
    const logado = { autenticar: true }

    this.listar = rota(
      async ({ request }) => {
        const p = new URL(request.url).searchParams
        const ativo = p.get('ativo')
        return s.listar({
          busca: p.get('busca') ?? '',
          ativo: ativo === 'true' ? true : ativo === 'false' ? false : undefined,
          pagina: p.get('pagina'),
          porPagina: p.get('porPagina'),
        })
      },
      { ...admin, rotulo: 'GET /api/vendedores' }
    )

    this.criar = rota(async ({ corpo }) => Resposta.criado({ vendedor: await s.criar(corpo) }), { ...admin, corpo: 'json', rotulo: 'POST /api/vendedores' })

    this.buscar = rota(async ({ params, vendedor }) => ({ vendedor: await s.buscarComPermissao(lerId(params.id), vendedor) }), {
      ...logado,
      rotulo: 'GET /api/vendedores/:id',
    })

    this.atualizar = rota(async ({ params, corpo, vendedor }) => ({ vendedor: await s.atualizar(lerId(params.id), corpo, vendedor) }), {
      ...logado,
      corpo: 'json',
      rotulo: 'PATCH /api/vendedores/:id',
    })

    this.desativar = rota(async ({ params, vendedor }) => ({ vendedor: await s.desativar(lerId(params.id), vendedor) }), {
      ...admin,
      rotulo: 'DELETE /api/vendedores/:id',
    })

    this.alterarSenha = rota(
      async ({ params, corpo, vendedor }) => {
        await s.alterarSenha(lerId(params.id), corpo, vendedor)
        return Resposta.semConteudo()
      },
      { ...logado, corpo: 'json', rotulo: 'PUT /api/vendedores/:id/senha' }
    )

    this.meuCadastro = rota(async ({ vendedor }) => ({ vendedor: await s.buscar(vendedor.id) }), { ...logado, rotulo: 'GET /api/vendedores/eu' })

    this.atualizarMeuCadastro = rota(async ({ corpo, vendedor }) => ({ vendedor: await s.atualizarProprio(vendedor, corpo) }), {
      ...logado,
      corpo: 'json',
      rotulo: 'PATCH /api/vendedores/eu',
    })

    // Mesmo sendo admin, trocar a PRÓPRIA senha exige a senha atual
    this.alterarMinhaSenha = rota(
      async ({ corpo, vendedor }) => {
        await s.alterarSenha(vendedor.id, corpo, vendedor, { exigirSenhaAtual: true })
        return Resposta.semConteudo()
      },
      { ...logado, corpo: 'json', rotulo: 'PUT /api/vendedores/eu/senha' }
    )
  }
}
