// Endereço do vendedor e local de retirada ("Retirar c/ vendedor") — navegador, servidor e scripts.
// Sem dependências: pode ser importado por scripts Node.

export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

// 01310100 → 01310-100
export const formatarCep = (valor) => {
  const d = String(valor ?? '').replace(/\D/g, '')
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

export const mascaraCep = (valor) => {
  const d = String(valor ?? '').replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

// "-23.5505, -46.6333" → { lat, lng } (ou null se não forem coordenadas)
export function lerCoordenadas(valor) {
  const m = /^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/.exec(String(valor ?? '').trim())
  if (!m) return null
  const lat = Number(m[1])
  const lng = Number(m[2])
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null
}

// Só links do próprio Google Maps (https)
const HOSTS_GOOGLE = /^(www\.|maps\.)?google\.com(\.br)?$/
export function linkGoogleMapsValido(valor) {
  let url
  try {
    url = new URL(String(valor ?? '').trim())
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || url.username || url.password) return false
  if (url.hostname === 'maps.app.goo.gl') return true
  if (url.hostname === 'goo.gl') return url.pathname.startsWith('/maps')
  if (url.hostname.startsWith('maps.google.')) return HOSTS_GOOGLE.test(url.hostname)
  return HOSTS_GOOGLE.test(url.hostname) && url.pathname.startsWith('/maps')
}

// Localização = link do Google Maps ou coordenadas "latitude, longitude".
// Devolve { valor } normalizado (null = vazio) ou { erro }.
export function normalizarLocalizacao(entrada) {
  const texto = String(entrada ?? '').trim()
  if (!texto) return { valor: null }
  const coordenadas = lerCoordenadas(texto)
  if (coordenadas) return { valor: `${coordenadas.lat},${coordenadas.lng}` }
  if (texto.length <= 500 && linkGoogleMapsValido(texto)) return { valor: texto }
  return { erro: 'Cole o link do Google Maps ou as coordenadas, ex.: -23.5505, -46.6333.' }
}

// "Rua X, 123 — Cidade - UF — CEP 00000-000" (só o que estiver preenchido)
export function enderecoCompleto(local) {
  const cidadeUf = [local.cidade, local.uf].filter(Boolean).join(' - ')
  return [local.endereco, cidadeUf, local.cep && `CEP ${formatarCep(local.cep)}`].filter(Boolean).join(', ')
}

// O que o Google Maps deve procurar: as coordenadas, se houver; senão o endereço
function consultaMapa(local) {
  const coordenadas = lerCoordenadas(local.localizacao)
  if (coordenadas) return `${coordenadas.lat},${coordenadas.lng}`
  return local.endereco || local.cidade ? enderecoCompleto(local) : null
}

// Link que abre o local no Google Maps (o link colado pelo vendedor tem prioridade)
export function linkMapa(local) {
  if (local.localizacao && !lerCoordenadas(local.localizacao)) return local.localizacao
  const consulta = consultaMapa(local)
  return consulta ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}` : null
}

// Endereço do mapa embutido na página (null quando só há um link curto, que não dá para embutir)
export function urlMapaEmbutido(local) {
  const consulta = consultaMapa(local)
  return consulta ? `https://www.google.com/maps?q=${encodeURIComponent(consulta)}&z=16&output=embed` : null
}
