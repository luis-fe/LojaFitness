// Regras de negócio dos dados da empresa (Perfil → Minha Empresa).
//   • CNPJ e Razão Social obrigatórios; os demais campos são opcionais (vazio = null).
//   • CNPJ / CEP / contato são guardados só com dígitos.
//   • Localização: coordenadas "latitude, longitude" (ex.: -16.8233, -49.2439).
//   • Endereço (rua, número, complemento, bairro, cidade, UF): remetente da etiqueta do Melhor Envio.
import 'server-only'
import { validarOuFalhar } from '@/server/erros'
import { soDigitos, cnpjValido, telefoneValido } from '@/server/utils/validacao'
import { lerCoordenadas, UFS } from '@/lib/retirada'
import { numeroWhatsApp } from '@/lib/whatsapp'

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

    // Endereço do remetente (opcional aqui; a etiqueta do Melhor Envio exige rua, número, bairro, cidade e UF)
    for (const [campo, rotulo, min, max] of [
      ['logradouro', 'Rua', 2, 120],
      ['numero', 'Número', 1, 20],
      ['complemento', 'Complemento', 0, 60],
      ['bairro', 'Bairro', 2, 80],
      ['cidade', 'Cidade', 2, 80],
    ]) {
      const v = texto(e[campo])
      if (v && (v.length < min || v.length > max)) erros[campo] = `${rotulo} deve ter de ${Math.max(min, 1)} a ${max} caracteres.`
      else dados[campo] = v || null
    }
    const uf = texto(e.uf).toUpperCase()
    if (uf && !UFS.includes(uf)) erros.uf = 'UF inválida.'
    else dados.uf = uf || null

    validarOuFalhar(erros)
    return dados
  }

  buscar() {
    return this.repo.buscar()
  }

  // WhatsApp da loja: Minha Empresa → Contato (com o 55 do Brasil). null se não houver contato.
  async whatsapp() {
    return numeroWhatsApp((await this.repo.buscar())?.contato) || null
  }

  // Local de retirada mostrado na loja ("Retirar c/ vendedor"): só o que é público.
  // null quando a empresa ainda não tem a localização cadastrada.
  async localRetirada() {
    const e = await this.repo.buscar()
    if (!e?.localizacao_coordenada) return null
    return { nome: e.razao_social, cep: e.cep, localizacao: e.localizacao_coordenada }
  }

  salvar(entrada, vendedor) {
    return this.repo.salvar(EmpresaServico.validar(entrada ?? {}), vendedor?.id)
  }
}
