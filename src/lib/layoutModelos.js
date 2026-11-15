// Modelos de camada da página inicial e validação — usado no navegador e no servidor.
//
// O layout é uma lista ordenada de camadas. Cada camada tem:
//   { id, tipo, visivel, dados }
// tipos: 'destaque' | 'cascata' | 'lado-a-lado' | 'produtos'

export const MAX_CAMADAS = 20
export const MAX_IMAGENS_POR_CAMADA = 12

export const MODELOS = {
  destaque: {
    nome: 'Imagem destacada',
    descricao: 'Uma imagem grande com título, texto e botões. Ideal para a abertura e campanhas.',
    novo: () => ({
      selo: 'Novidade',
      titulo: 'Título da campanha',
      texto: 'Escreva aqui uma frase curta que convide a comprar.',
      imagem: null,
      posicao: 'direita',
      botaoTexto: 'Comprar agora',
      botaoLink: '/#novidades',
      botao2Texto: '',
      botao2Link: '',
    }),
  },
  cascata: {
    nome: 'Cascata de imagens',
    descricao: 'Várias fotos em colunas, com alturas diferentes, como um mural.',
    novo: () => ({ titulo: 'Inspire-se', subtitulo: '', colunas: 3, imagens: [] }),
  },
  'lado-a-lado': {
    nome: 'Imagens lado a lado',
    descricao: 'De 2 a 4 fotos do mesmo tamanho, alinhadas na mesma linha.',
    novo: () => ({ titulo: '', subtitulo: '', proporcao: 'retrato', imagens: [] }),
  },
  produtos: {
    nome: 'Vitrine de produtos',
    descricao: 'Carrossel com os produtos da loja, preço e botão de comprar.',
    novo: () => ({ selo: 'Lançamentos', titulo: 'Novidades' }),
  },
}

export const novoId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export function novaCamada(tipo) {
  return { id: novoId(), tipo, visivel: true, dados: MODELOS[tipo].novo() }
}

// Layout atual do site (o que existia antes do construtor)
export const LAYOUT_PADRAO = [
  {
    id: 'padrao-destaque',
    tipo: 'destaque',
    visivel: true,
    dados: {
      selo: 'Black Friday',
      titulo: 'Conforto para treinar. Estilo para o dia a dia.',
      texto: 'Conjuntos fitness que valorizam o seu corpo com preços especiais de Black Friday.',
      imagem: { url: '/images/hero-conjunto.jpg', alt: 'Modelo vestindo conjunto fitness preto com top e legging JLK' },
      posicao: 'direita',
      botaoTexto: 'Comprar agora',
      botaoLink: '/#novidades',
      botao2Texto: 'Ver ofertas',
      botao2Link: '/#black-friday',
    },
  },
  { id: 'padrao-produtos', tipo: 'produtos', visivel: true, dados: { selo: 'Lançamentos', titulo: 'Novidades' } },
]

// Imagens que já vêm com o site (podem ser usadas sem enviar nada)
export const IMAGENS_PADRAO = [
  { codigo: 'SITE-BANNER', descricao: 'Banner — conjunto preto', url: '/images/hero-conjunto.jpg' },
  { codigo: 'SITE-CONJ-CALCA', descricao: 'Conjunto calça azul', url: '/images/conjunto-calca.jpg' },
  { codigo: 'SITE-CONJ-SHORT', descricao: 'Conjunto short azul', url: '/images/conjunto-short.jpg' },
  { codigo: 'SITE-CONJ-BERMUDA', descricao: 'Conjunto bermuda azul', url: '/images/conjunto-bermuda.jpg' },
]

// ---------------------------------------------------------------------------
// Validação (o servidor sempre valida antes de salvar)
// ---------------------------------------------------------------------------

const texto = (v, max) => String(v ?? '').trim().slice(0, max)

// Imagens: só do próprio site (enviadas ou padrão)
const urlImagemValida = (u) =>
  typeof u === 'string' && (/^\/arquivos\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(u) || /^\/images\/[\w.-]+\.(jpg|jpeg|png|webp)$/.test(u))

// Links: páginas do site (/...), âncoras, https ou WhatsApp
const linkValido = (u) => u === '' || /^\/[^\s]*$/.test(u) || /^#[\w-]+$/.test(u) || /^https:\/\/[^\s]+$/.test(u)

function imagem(i, erros, onde) {
  if (!i) return null
  if (!urlImagemValida(i.url)) {
    erros.push(`${onde}: imagem inválida.`)
    return null
  }
  return { url: i.url, alt: texto(i.alt, 200) }
}

function link(v, erros, onde) {
  const l = texto(v, 300)
  if (!linkValido(l)) erros.push(`${onde}: link inválido (use /pagina, https://... ou deixe vazio).`)
  return l
}

function listaImagens(lista, erros, onde, { min = 0 } = {}) {
  if (!Array.isArray(lista)) return []
  if (lista.length > MAX_IMAGENS_POR_CAMADA) erros.push(`${onde}: no máximo ${MAX_IMAGENS_POR_CAMADA} imagens.`)
  const saida = lista.slice(0, MAX_IMAGENS_POR_CAMADA).map((it, n) => {
    const img = imagem(it, erros, `${onde}, imagem ${n + 1}`)
    return img && { ...img, legenda: texto(it.legenda, 120), link: link(it.link, erros, `${onde}, imagem ${n + 1}`) }
  })
  const validas = saida.filter(Boolean)
  if (validas.length < min) erros.push(`${onde}: adicione pelo menos ${min} imagens.`)
  return validas
}

export function validarLayout(entrada) {
  const erros = []
  if (!Array.isArray(entrada)) return { ok: false, erros: ['O layout deve ser uma lista de camadas.'] }
  if (entrada.length > MAX_CAMADAS) erros.push(`No máximo ${MAX_CAMADAS} camadas.`)

  const ids = new Set()
  const camadas = entrada.slice(0, MAX_CAMADAS).map((c, n) => {
    const onde = `Camada ${n + 1}`
    if (!c || !MODELOS[c.tipo]) {
      erros.push(`${onde}: tipo desconhecido.`)
      return null
    }
    let id = texto(c.id, 64) || novoId()
    if (ids.has(id)) id = novoId()
    ids.add(id)
    const d = c.dados ?? {}
    let dados

    switch (c.tipo) {
      case 'destaque':
        dados = {
          selo: texto(d.selo, 40),
          titulo: texto(d.titulo, 120),
          texto: texto(d.texto, 300),
          imagem: imagem(d.imagem, erros, onde),
          posicao: d.posicao === 'esquerda' ? 'esquerda' : 'direita',
          botaoTexto: texto(d.botaoTexto, 40),
          botaoLink: link(d.botaoLink, erros, `${onde}, botão 1`),
          botao2Texto: texto(d.botao2Texto, 40),
          botao2Link: link(d.botao2Link, erros, `${onde}, botão 2`),
        }
        if (!dados.titulo) erros.push(`${onde}: informe o título.`)
        break
      case 'cascata':
        dados = {
          titulo: texto(d.titulo, 120),
          subtitulo: texto(d.subtitulo, 200),
          colunas: [2, 3, 4].includes(Number(d.colunas)) ? Number(d.colunas) : 3,
          imagens: listaImagens(d.imagens, erros, onde),
        }
        break
      case 'lado-a-lado':
        dados = {
          titulo: texto(d.titulo, 120),
          subtitulo: texto(d.subtitulo, 200),
          proporcao: ['quadrada', 'retrato', 'paisagem'].includes(d.proporcao) ? d.proporcao : 'retrato',
          imagens: listaImagens(d.imagens, erros, onde).slice(0, 4),
        }
        break
      case 'produtos':
        dados = { selo: texto(d.selo, 40), titulo: texto(d.titulo, 120) }
        break
    }
    return { id, tipo: c.tipo, visivel: c.visivel !== false, dados }
  })

  return erros.length ? { ok: false, erros } : { ok: true, camadas: camadas.filter(Boolean) }
}
