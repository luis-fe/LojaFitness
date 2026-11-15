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
