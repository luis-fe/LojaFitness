// Dados do cliente pedidos antes de enviar o pedido pelo WhatsApp.
// Usado no navegador (formulário) e no servidor (conferência e gravação na tabela clientes).

export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

export const soDigitosCep = (v) => String(v ?? '').replace(/\D/g, '').slice(0, 8)

// "01310100" → "01310-100"
export const formatarCep = (v) => {
  const d = soDigitosCep(v)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

const texto = (v, max) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)

// Devolve { dados, erros } — erros vazio = pode enviar
export function validarCliente(c = {}) {
  const dados = {
    nome: texto(c.nome, 120),
    cep: soDigitosCep(c.cep),
    bairro: texto(c.bairro, 80),
    cidade: texto(c.cidade, 80),
    estado: texto(c.estado, 2).toUpperCase(),
  }
  const erros = {}
  if (dados.nome.length < 3) erros.nome = 'Informe seu nome.'
  if (dados.cep.length !== 8) erros.cep = 'Informe um CEP com 8 números.'
  if (dados.bairro.length < 2) erros.bairro = 'Informe o bairro.'
  if (dados.cidade.length < 2) erros.cidade = 'Informe a cidade.'
  if (!UFS.includes(dados.estado)) erros.estado = 'Estado inválido.'
  return { dados, erros }
}

// Busca o endereço do CEP no ViaCEP (consulta pública dos Correios), direto do navegador
export async function buscarCep(cep) {
  const d = soDigitosCep(cep)
  if (d.length !== 8) return null
  const resposta = await fetch(`https://viacep.com.br/ws/${d}/json/`)
  if (!resposta.ok) throw new Error('falha')
  const j = await resposta.json()
  if (j.erro) return null
  return { logradouro: j.logradouro ?? '', bairro: j.bairro ?? '', cidade: j.localidade ?? '', estado: j.uf ?? '' }
}
