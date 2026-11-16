// Busca de produtos da loja (no navegador): procura pelo nome, descrição, categoria e campanha.
//   • ignora acentos e maiúsculas ("calca" acha "Calça")
//   • várias palavras: o produto precisa ter todas ("legging preta")
import { TIPOS_SELO } from '@/lib/selos'

export const normalizarBusca = (v) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

const nomeTipo = (id) => TIPOS_SELO.find((t) => t.id === id)?.nome ?? ''

// Etiquetas do produto mostradas no resultado: categoria e/ou campanha
export function etiquetasProduto(p) {
  const etiquetas = []
  if (p.selo) etiquetas.push({ tipo: p.seloTipo, rotulo: `${nomeTipo(p.seloTipo) || 'Campanha'}: ${p.selo}` })
  if (p.campanha && p.campanha !== p.selo) etiquetas.push({ tipo: 'campanha', rotulo: `Campanha: ${p.campanha}` })
  return etiquetas
}

// Pontua para ordenar: nome vale mais que categoria/campanha, que valem mais que a descrição
export function buscarProdutos(produtos, termo) {
  const palavras = normalizarBusca(termo).split(/\s+/).filter(Boolean)
  if (!palavras.length) return []
  const resultado = []
  for (const p of produtos) {
    const nome = normalizarBusca(p.nome)
    const selos = normalizarBusca([p.selo, p.campanha, nomeTipo(p.seloTipo)].filter(Boolean).join(' '))
    const descricao = normalizarBusca(p.descricao)
    let pontos = 0
    let todas = true
    for (const w of palavras) {
      if (nome.includes(w)) pontos += nome.startsWith(w) ? 4 : 3
      else if (selos.includes(w)) pontos += 2
      else if (descricao.includes(w)) pontos += 1
      else {
        todas = false
        break
      }
    }
    if (todas) resultado.push({ p, pontos })
  }
  return resultado.sort((a, b) => b.pontos - a.pontos).map((r) => r.p)
}
