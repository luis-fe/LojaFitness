// Dados de entrega pedidos no ato da compra quando o cliente escolhe "Receber em casa"
// (etiqueta do Melhor Envio). Usado no navegador (formulário) e no servidor (conferência e gravação em clientes).
import { cpfValido, telefoneValido } from '@/server/utils/validacao'

const soDigitos = (v) => String(v ?? '').replace(/\D/g, '')
const texto = (v, max) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)

export const ENTREGA_VAZIA = { logradouro: '', numero: '', complemento: '', cpf: '', telefone: '', email: '' }

// "52998224725" → "529.982.247-25" (enquanto digita)
export function mascaraCpf(v) {
  const d = soDigitos(v).slice(0, 11)
  return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}

// Devolve { dados, erros } — erros vazio = completo
export function validarEntrega(e = {}) {
  const dados = {
    logradouro: texto(e.logradouro, 120),
    numero: texto(e.numero, 20),
    complemento: texto(e.complemento, 60),
    cpf: soDigitos(e.cpf),
    telefone: soDigitos(e.telefone),
    email: texto(e.email, 200).toLowerCase(),
  }
  const erros = {}
  if (dados.logradouro.length < 2) erros.logradouro = 'Informe a rua.'
  if (!dados.numero) erros.numero = 'Informe o número (ou S/N).'
  if (!cpfValido(dados.cpf)) erros.cpf = 'CPF inválido.'
  if (!telefoneValido(dados.telefone)) erros.telefone = 'Celular inválido. Informe DDD + número.'
  if (dados.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dados.email)) erros.email = 'E-mail inválido.'
  return { dados, erros }
}
