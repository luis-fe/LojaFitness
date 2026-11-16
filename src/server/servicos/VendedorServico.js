// Regras de negócio dos vendedores.
//
//   • Senha sempre criptografada; nunca sai nas respostas.
//   • Admin gerencia todos; vendedor só o próprio cadastro (nome, telefone, CPF/CNPJ, nome fantasia, endereço).
//   • O endereço/localização do vendedor ativo é público: é o local de retirada do pedido.
//   • Vendedor não é apagado: é desativado (preserva o histórico).
//   • Sempre existe pelo menos 1 administrador ativo; ninguém remove o próprio acesso de admin.
//   • Trocar a senha ou desativar derruba as sessões (tokens) existentes.
import 'server-only'
import { ErroConflito, ErroNaoEncontrado, ErroPermissao, ErroRequisicao, ErroValidacao, validarOuFalhar } from '@/server/erros'
import { gerarHashSenha, conferirSenha } from '@/server/utils/senha'
import { validarVendedor, validarSenha } from '@/server/utils/validacao'

const CAMPOS_PROPRIO = ['nome', 'telefone', 'cpf_cnpj', 'nome_fantasia', 'cep', 'endereco', 'uf', 'cidade', 'localizacao']
const MAX_LOCAIS_RETIRADA = 5
const CAMPOS_ADMIN = [...CAMPOS_PROPRIO, 'login', 'papel', 'ativo']

export class VendedorServico {
  constructor({ banco, vendedorRepositorio }) {
    this.banco = banco
    this.repo = vendedorRepositorio
  }

  async listar({ busca = '', ativo, pagina = 1, porPagina = 20 } = {}) {
    pagina = Math.max(1, Number.parseInt(pagina, 10) || 1)
    porPagina = Math.min(100, Math.max(1, Number.parseInt(porPagina, 10) || 20))
    const { linhas, total } = await this.repo.listar({ busca, ativo, pagina, porPagina })
    return { vendedores: linhas, paginacao: { pagina, porPagina, total, totalPaginas: Math.ceil(total / porPagina) } }
  }

  // Site público: onde o cliente retira o pedido ("Retirar c/ vendedor")
  locaisRetirada() {
    return this.repo.listarLocaisRetirada(MAX_LOCAIS_RETIRADA)
  }

  async buscar(id) {
    const vendedor = await this.repo.buscarPorId(id)
    if (!vendedor) throw new ErroNaoEncontrado('Vendedor não encontrado.')
    return vendedor
  }

  // Admin pode ver qualquer um; vendedor só a si mesmo
  async buscarComPermissao(id, autor) {
    if (autor.papel !== 'admin' && autor.id !== id) throw new ErroPermissao()
    return this.buscar(id)
  }

  async criar(entrada) {
    const { dados, erros } = validarVendedor(entrada)
    validarOuFalhar(erros, 'Dados inválidos.')
    return this.repo.inserir(dados, await gerarHashSenha(dados.senha))
  }

  async atualizar(id, entrada, autor) {
    const ehAdmin = autor.papel === 'admin'
    const ehProprio = autor.id === id
    if (!ehAdmin && !ehProprio) throw new ErroPermissao('Você só pode alterar o seu próprio cadastro.')

    const enviados = Object.keys(entrada ?? {})
    if (enviados.includes('senha')) throw new ErroRequisicao('Para trocar a senha use a rota de senha.')
    const permitidos = ehAdmin ? CAMPOS_ADMIN : CAMPOS_PROPRIO
    const proibidos = enviados.filter((c) => !permitidos.includes(c))
    if (proibidos.length) throw new ErroPermissao(`Você não pode alterar: ${proibidos.join(', ')}.`)

    const { dados, erros } = validarVendedor(entrada, { parcial: true })
    validarOuFalhar(erros, 'Dados inválidos.')
    if (!Object.keys(dados).length) throw new ErroRequisicao('Nenhum campo para atualizar.')

    return this.banco.transacao(async (db) => {
      const atual = await this.repo.travar(db, id)
      if (!atual) throw new ErroNaoEncontrado('Vendedor não encontrado.')

      // A loja nunca fica sem administrador
      const deixaDeSerAdminAtivo = atual.papel === 'admin' && atual.ativo && (dados.papel === 'vendedor' || dados.ativo === false)
      if (deixaDeSerAdminAtivo) {
        if (ehProprio) throw new ErroConflito('Você não pode remover o seu próprio acesso de administrador.')
        if ((await this.repo.contarAdminsAtivos(db, id)) === 0) throw new ErroConflito('A loja precisa de pelo menos um administrador ativo.')
      }
      // Desativar também invalida os tokens já emitidos
      return this.repo.atualizar(db, id, dados, { derrubarSessoes: dados.ativo === false })
    })
  }

  // Atalho "meu cadastro": mesmo sendo admin, só os campos do próprio perfil
  async atualizarProprio(autor, entrada) {
    const extras = Object.keys(entrada ?? {}).filter((c) => !CAMPOS_PROPRIO.includes(c))
    if (extras.length) throw new ErroRequisicao(`Campos não permitidos aqui: ${extras.join(', ')}.`)
    return this.atualizar(autor.id, entrada, autor)
  }

  desativar(id, autor) {
    return this.atualizar(id, { ativo: false }, autor)
  }

  // Próprio vendedor: exige senha atual. Admin (em outro vendedor): redefine sem a senha atual.
  async alterarSenha(id, { senhaAtual, novaSenha } = {}, autor, { exigirSenhaAtual } = {}) {
    const ehProprio = autor.id === id
    if (autor.papel !== 'admin' && !ehProprio) throw new ErroPermissao('Você só pode alterar a sua própria senha.')

    const erroSenha = validarSenha(novaSenha)
    if (erroSenha) throw new ErroValidacao({ novaSenha: erroSenha }, 'Dados inválidos.')

    const hashAtual = await this.repo.buscarHashSenha(id)
    if (!hashAtual) throw new ErroNaoEncontrado('Vendedor não encontrado.')

    if (ehProprio || exigirSenhaAtual) {
      if (!senhaAtual || !(await conferirSenha(String(senhaAtual), hashAtual))) {
        throw new ErroValidacao({ senhaAtual: 'Senha atual incorreta.' }, 'Senha atual incorreta.')
      }
      if (await conferirSenha(novaSenha, hashAtual)) {
        throw new ErroValidacao({ novaSenha: 'A nova senha deve ser diferente da atual.' })
      }
    }
    await this.repo.atualizarSenha(id, await gerarHashSenha(novaSenha))
  }
}
