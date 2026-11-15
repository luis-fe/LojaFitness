// Validações e normalizações compartilhadas (servidor e scripts).
// Sem dependências do Next.js: pode ser importado por scripts Node.

export const SENHA_MINIMA = 8
export const SENHA_MAXIMA = 200

export const soDigitos = (valor) => String(valor ?? '').replace(/\D/g, '')

export function normalizarLogin(valor) {
  return String(valor ?? '').trim().toLowerCase()
}

export function loginValido(login) {
  return /^[a-z0-9._-]{3,40}$/.test(login)
}

// Telefone brasileiro: DDD + número (10 ou 11 dígitos), com ou sem o 55 do país
export function telefoneValido(digitos) {
  return /^(55)?[1-9][0-9]{9,10}$/.test(digitos)
}

export function cpfValido(cpf) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false
  const digito = (base) => {
    const soma = [...base].reduce((s, n, i) => s + Number(n) * (base.length + 1 - i), 0)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return digito(cpf.slice(0, 9)) === Number(cpf[9]) && digito(cpf.slice(0, 10)) === Number(cpf[10])
}

export function cnpjValido(cnpj) {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false
  const digito = (base) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const resto = [...base].reduce((s, n, i) => s + Number(n) * pesos[i], 0) % 11
    return resto < 2 ? 0 : 11 - resto
  }
  return digito(cnpj.slice(0, 12)) === Number(cnpj[12]) && digito(cnpj.slice(0, 13)) === Number(cnpj[13])
}

export function cpfCnpjValido(digitos) {
  return digitos.length === 11 ? cpfValido(digitos) : digitos.length === 14 ? cnpjValido(digitos) : false
}

export function validarSenha(senha) {
  if (typeof senha !== 'string' || senha.length < SENHA_MINIMA) {
    return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`
  }
  if (senha.length > SENHA_MAXIMA) return `A senha pode ter no máximo ${SENHA_MAXIMA} caracteres.`
  return null
}

// Valida e normaliza os dados de um vendedor.
//   parcial = true  → só valida os campos enviados (para edição)
// Retorna { dados, erros } — erros é um objeto { campo: mensagem }.
export function validarVendedor(entrada = {}, { parcial = false } = {}) {
  const dados = {}
  const erros = {}
  const enviado = (campo) => Object.prototype.hasOwnProperty.call(entrada, campo)
  const texto = (v) => (v === null || v === undefined ? '' : String(v).trim())

  if (!parcial || enviado('login')) {
    const login = normalizarLogin(entrada.login)
    if (!loginValido(login)) erros.login = 'Use de 3 a 40 letras minúsculas, números, ponto, hífen ou _.'
    else dados.login = login
  }

  if (!parcial || enviado('nome')) {
    const nome = texto(entrada.nome)
    if (nome.length < 2 || nome.length > 120) erros.nome = 'Informe o nome (2 a 120 caracteres).'
    else dados.nome = nome
  }

  if (!parcial || enviado('telefone')) {
    const telefone = soDigitos(entrada.telefone)
    if (!telefoneValido(telefone)) erros.telefone = 'Telefone inválido. Informe DDD + número, ex.: (11) 98765-4321.'
    else dados.telefone = telefone
  }

  if (enviado('cpf_cnpj')) {
    const documento = soDigitos(entrada.cpf_cnpj)
    if (!documento) dados.cpf_cnpj = null // opcional: vazio remove
    else if (!cpfCnpjValido(documento)) erros.cpf_cnpj = 'CPF ou CNPJ inválido.'
    else dados.cpf_cnpj = documento
  }

  if (enviado('nome_fantasia')) {
    const fantasia = texto(entrada.nome_fantasia)
    if (!fantasia) dados.nome_fantasia = null // opcional: vazio remove
    else if (fantasia.length < 2 || fantasia.length > 120) erros.nome_fantasia = 'Nome fantasia deve ter de 2 a 120 caracteres.'
    else dados.nome_fantasia = fantasia
  }

  if (!parcial || enviado('senha')) {
    const erroSenha = validarSenha(entrada.senha)
    if (erroSenha) erros.senha = erroSenha
    else dados.senha = entrada.senha
  }

  if (enviado('papel')) {
    if (!['vendedor', 'admin'].includes(entrada.papel)) erros.papel = 'Papel deve ser "vendedor" ou "admin".'
    else dados.papel = entrada.papel
  }

  if (enviado('ativo')) {
    if (typeof entrada.ativo !== 'boolean') erros.ativo = 'Ativo deve ser true ou false.'
    else dados.ativo = entrada.ativo
  }

  return { dados, erros }
}
