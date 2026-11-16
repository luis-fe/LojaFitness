// Selo-Campanha dos produtos (ex.: "Black Friday", "Camiseta") — usado no navegador e no servidor.

// Tipo do selo: define em qual grupo do menu lateral ele aparece
export const TIPOS_SELO = [
  { id: 'categoria', nome: 'Categoria', plural: 'Categorias' }, // ex.: Camiseta, Conjunto, Legging
  { id: 'campanha', nome: 'Campanha', plural: 'Campanhas' }, // ex.: Black Friday, Lançamento
]
export const TIPO_SELO_PADRAO = 'campanha'
export const tipoSeloValido = (v) => TIPOS_SELO.some((t) => t.id === v)

// "  black   friday " → "black friday"
export const normalizarSelo = (v) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)

// "Black Friday" → "black-friday" (endereço da página: /selo/black-friday)
export const slugDoSelo = (v) =>
  normalizarSelo(v)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
