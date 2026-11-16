// Ícones da Área do Vendedor (traço, herdam a cor do texto)
const Svg = ({ children }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

export const IconePerfil = () => (
  <Svg>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Svg>
)

export const IconeNovoVendedor = () => (
  <Svg>
    <circle cx="10" cy="8" r="4" />
    <path d="M2 21a8 8 0 0 1 13.3-6" />
    <path d="M19 14v6M16 17h6" />
  </Svg>
)

// Duas pessoas (lista de vendedores)
export const IconeVendedores = () => (
  <Svg>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M15.5 4.6a3.5 3.5 0 0 1 0 6.8" />
    <path d="M18 14.2A6.5 6.5 0 0 1 21.5 20" />
  </Svg>
)

export const IconeEditarPerfil = () => (
  <Svg>
    <circle cx="10" cy="8" r="4" />
    <path d="M2 21a8 8 0 0 1 11-7.4" />
    <path d="M17.5 13.5l3 3-5 5h-3v-3z" />
  </Svg>
)

export const IconeProdutos = () => (
  <Svg>
    <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </Svg>
)

export const IconeSite = () => (
  <Svg>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M2 9h20M9 9v11" />
  </Svg>
)

export const IconeImagem = () => (
  <Svg>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </Svg>
)

export const IconeCampanha = () => (
  <Svg>
    <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </Svg>
)

export const IconeCadeado = () => (
  <Svg>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Svg>
)

export const IconeSeta = () => (
  <Svg>
    <path d="M9 6l6 6-6 6" />
  </Svg>
)

export const IconeTamanhos = () => (
  <Svg>
    <path d="M3 8l5-5 13 13-5 5z" />
    <path d="M7 10l2-2M10 13l2-2M13 16l2-2" />
  </Svg>
)

export const IconeCores = () => (
  <Svg>
    <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.9 0-.5-.2-.9-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z" />
    <circle cx="7.5" cy="11" r="1.2" />
    <circle cx="10" cy="7" r="1.2" />
    <circle cx="15" cy="7.5" r="1.2" />
  </Svg>
)

export const IconeCaixa = () => (
  <Svg>
    <path d="M21 8l-9-5-9 5 9 5 9-5z" />
    <path d="M3 8v8l9 5 9-5V8" />
    <path d="M12 13v8" />
  </Svg>
)

export const IconeSubir = () => (
  <Svg>
    <path d="M12 16V4M7 9l5-5 5 5" />
    <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </Svg>
)

// Olho aberto = senha oculta (clique para mostrar) · olho cortado = senha visível (clique para ocultar)
export const IconeOlho = () => (
  <Svg>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)

export const IconeOlhoFechado = () => (
  <Svg>
    <path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-2.9 3.9" />
    <path d="M6.6 6.6C3.7 8.5 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="M3 3l18 18" />
  </Svg>
)

// Rosto (somente a cabeça), usado no card Perfil
export const IconeRosto = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
    <path d="M9 9.5h.01M15 9.5h.01" strokeWidth="2.6" />
  </Svg>
)

export const IconeVisitantes = () => (
  <Svg>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)

export const IconeVariacoes = () => (
  <Svg>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Svg>
)

// Fachada de loja com toldo (Área do Vendedor)
export const IconeLoja = () => (
  <Svg>
    <path d="M3 9.5 4.6 4h14.8L21 9.5" />
    <path d="M3 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
    <path d="M5 12v8h14v-8" />
    <path d="M10 20v-5h4v5" />
  </Svg>
)
