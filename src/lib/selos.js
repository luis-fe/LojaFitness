// Selo-Campanha dos produtos (ex.: "Black Friday", "Camiseta") — usado no navegador e no servidor.

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
