// Regras de envio de imagens usadas no navegador (seletor de imagens e tela de imagens)

export const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp']
export const TAMANHO_MAX = 5 * 1024 * 1024

// "Conjunto calça azul.jpg" → "CONJUNTO-CALCA-AZUL"
export function codigoDoNome(nome) {
  return nome
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^A-Z0-9.-]/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 60)
}

// "Conjunto calça azul.jpg" → "Conjunto calça azul"
export const descricaoDoNome = (nome) =>
  nome
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .slice(0, 200)

export const mascaraCodigo = (v) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s/g, '-')
    .replace(/[^A-Z0-9._-]/g, '')
    .slice(0, 60)
