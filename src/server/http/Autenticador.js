// Confere o token Bearer de cada requisição protegida.
//
// Além da assinatura e da validade do JWT, consulta o banco para garantir que o vendedor
// continua ATIVO e que o token não é anterior a uma troca de senha (sessões "derrubáveis").
// O papel usado é o atual do banco (se o admin mudar o papel, vale na hora).
import 'server-only'
import { ErroNaoAutenticado, ErroPermissao } from '@/server/erros'

export class Autenticador {
  constructor({ authServico, vendedorRepositorio }) {
    this.auth = authServico
    this.vendedores = vendedorRepositorio
  }

  static lerBearer(request) {
    const cabecalho = request.headers.get('authorization') || ''
    const [tipo, token] = cabecalho.split(' ')
    return tipo?.toLowerCase() === 'bearer' && token ? token.trim() : null
  }

  // Devolve { id, login, nome, nome_fantasia, papel, expiraEm } ou lança erro 401/403
  async exigir(request, { papeis } = {}) {
    const token = Autenticador.lerBearer(request)
    if (!token) throw new ErroNaoAutenticado('Envie o cabeçalho Authorization: Bearer <token>.', 'token_ausente')

    const payload = await this.auth.verificarToken(token) // lança 401 se inválido/expirado

    const atual = await this.vendedores.buscarEstadoSessao(Number(payload.sub))
    if (!atual || !atual.ativo) {
      throw new ErroNaoAutenticado('Acesso desativado. Fale com o administrador da loja.', 'conta_inativa')
    }
    if (Math.floor(new Date(atual.senha_alterada_em).getTime() / 1000) > payload.iat) {
      throw new ErroNaoAutenticado('A senha foi alterada. Faça login novamente.', 'token_revogado')
    }

    const vendedor = {
      id: atual.id,
      login: atual.login,
      nome: atual.nome,
      nome_fantasia: atual.nome_fantasia,
      papel: atual.papel,
      expiraEm: new Date(payload.exp * 1000).toISOString(),
    }
    if (papeis && !papeis.includes(vendedor.papel)) throw new ErroPermissao()
    return vendedor
  }
}
