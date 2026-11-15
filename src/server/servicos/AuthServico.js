// Autenticação: login com senha e emissão/verificação de tokens JWT.
//
//   • Token assinado com JWT_SECRET (HS256), validade JWT_EXPIRACAO (padrão 3h).
//   • Mesma mensagem para login inexistente e senha errada (não revela quem tem conta).
//   • Limite de tentativas por IP + login.
import 'server-only'
import { SignJWT, jwtVerify, errors } from 'jose'
import { ErroNaoAutenticado, ErroPermissao, ErroMuitasTentativas, ErroRequisicao } from '@/server/erros'
import { conferirSenha, HASH_FICTICIO } from '@/server/utils/senha'
import { normalizarLogin } from '@/server/utils/validacao'

const EMISSOR = 'jlk-loja'
const AUDIENCIA = 'jlk-area-do-vendedor'
const ALGORITMO = 'HS256'
const CREDENCIAIS_INVALIDAS = 'Login ou senha incorretos.'

export class AuthServico {
  constructor({ vendedorRepositorio, limiteTentativas }) {
    this.vendedores = vendedorRepositorio
    this.limite = limiteTentativas
  }

  static #chave() {
    const segredo = process.env.JWT_SECRET
    if (!segredo || segredo.length < 32) {
      throw new Error('JWT_SECRET ausente ou curto demais (mínimo 32 caracteres). Veja .env.example.')
    }
    return new TextEncoder().encode(segredo)
  }

  async criarToken(vendedor) {
    const token = await new SignJWT({ login: vendedor.login, nome: vendedor.nome, papel: vendedor.papel })
      .setProtectedHeader({ alg: ALGORITMO, typ: 'JWT' })
      .setSubject(String(vendedor.id))
      .setIssuer(EMISSOR)
      .setAudience(AUDIENCIA)
      .setIssuedAt()
      .setExpirationTime(process.env.JWT_EXPIRACAO || '3h')
      .sign(AuthServico.#chave())
    const { exp, iat } = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    return { token, expiraEm: new Date(exp * 1000).toISOString(), expiraEmSegundos: exp - iat }
  }

  // Devolve o payload ou lança 401 (expirado / inválido)
  async verificarToken(token) {
    try {
      const { payload } = await jwtVerify(token, AuthServico.#chave(), { issuer: EMISSOR, audience: AUDIENCIA, algorithms: [ALGORITMO] })
      return payload
    } catch (erro) {
      if (erro instanceof errors.JWTExpired) throw new ErroNaoAutenticado('Sessão expirada. Faça login novamente.', 'token_expirado')
      if (erro instanceof errors.JOSEError) throw new ErroNaoAutenticado('Token inválido.', 'token_invalido')
      throw erro
    }
  }

  async entrar({ login: loginInformado, senha: senhaInformada }, ip) {
    const login = normalizarLogin(loginInformado)
    const senha = String(senhaInformada ?? '')
    if (!login || !senha) throw new ErroRequisicao('Informe login e senha.')
    if (login.length > 40 || senha.length > 200) throw new ErroNaoAutenticado(CREDENCIAIS_INVALIDAS, 'credenciais_invalidas')

    const chave = `${ip}|${login}`
    const situacao = this.limite.verificar(chave)
    if (situacao.bloqueado) {
      throw new ErroMuitasTentativas(`Muitas tentativas. Tente novamente em ${Math.ceil(situacao.tenteEmSegundos / 60)} minuto(s).`, situacao.tenteEmSegundos)
    }

    const vendedor = await this.vendedores.buscarParaLogin(login)
    // Confere a senha mesmo quando o login não existe (mesmo tempo de resposta)
    const senhaOk = await conferirSenha(senha, vendedor?.senha_hash ?? HASH_FICTICIO)
    if (!vendedor || !senhaOk) {
      this.limite.registrarFalha(chave)
      throw new ErroNaoAutenticado(CREDENCIAIS_INVALIDAS, 'credenciais_invalidas')
    }
    if (!vendedor.ativo) throw new ErroPermissao('Acesso desativado. Fale com o administrador da loja.', 'conta_inativa')

    this.limite.limpar(chave)
    await this.vendedores.registrarLogin(vendedor.id)
    const sessao = await this.criarToken(vendedor)
    const { senha_hash, ativo, ...publico } = vendedor
    return { ...sessao, tipo: 'Bearer', vendedor: publico }
  }
}
