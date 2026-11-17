// Regras de negócio dos dados da empresa (Perfil → Minha Empresa).
//   • CNPJ e Razão Social obrigatórios; os demais campos são opcionais (vazio = null).
//   • CNPJ / CEP / contato são guardados só com dígitos.
//   • Localização: coordenadas "latitude, longitude" (ex.: -16.8233, -49.2439).
import 'server-only'
import { validarOuFalhar } from '@/server/erros'
import { soDigitos, cnpjValido, telefoneValido } from '@/server/utils/validacao'
import { lerCoordenadas } from '@/lib/retirada'

const texto = (v) => (v === null || v === undefined ? '' : String(v).trim())

export class EmpresaServico {
  constructor({ empresaRepositorio }) {
    this.repo = empresaRepositorio
  }

  static validar(e = {}) {
    const dados = {}
    const erros = {}

    const cnpj = soDigitos(e.cnpj)
    if (!cnpjValido(cnpj)) erros.cnpj = 'CNPJ inválido.'
    else dados.cnpj = cnpj

    const razao = texto(e.razao_social)
    if (razao.length < 2 || razao.length > 150) erros.razao_social = 'Informe a razão social (2 a 150 caracteres).'
    else dados.razao_social = razao

    const adm = texto(e.administrador)
    if (adm && (adm.length < 2 || adm.length > 120)) erros.administrador = 'Administrador deve ter de 2 a 120 caracteres.'
    else dados.administrador = adm || null

    const cep = soDigitos(e.cep)
    if (cep && cep.length !== 8) erros.cep = 'CEP inválido. Informe os 8 números.'
    else dados.cep = cep || null

    const email = texto(e.email).toLowerCase()
    if (email && (email.length > 200 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) erros.email = 'E-mail inválido.'
    else dados.email = email || null

    const loc = texto(e.localizacao_coordenada)
    if (loc) {
      const c = lerCoordenadas(loc)
      if (!c) erros.localizacao_coordenada = 'Use "latitude, longitude", ex.: -16.8233, -49.2439.'
      else dados.localizacao_coordenada = `${c.lat},${c.lng}`
    } else dados.localizacao_coordenada = null

    if (e.e_mei !== undefined && typeof e.e_mei !== 'boolean') erros.e_mei = 'MEI deve ser verdadeiro ou falso.'
    else dados.e_mei = e.e_mei === true

    const contato = soDigitos(e.contato)
    if (contato && !telefoneValido(contato)) erros.contato = 'Telefone inválido. Informe DDD + número, ex.: (62) 98765-4321.'
    else dados.contato = contato || null

    validarOuFalhar(erros)
    return dados
  }

  buscar() {
    return this.repo.buscar()
  }

  salvar(entrada, vendedor) {
    return this.repo.salvar(EmpresaServico.validar(entrada ?? {}), vendedor?.id)
  }
}
