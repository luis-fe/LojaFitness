import './AreaVendedor.css'

const IconeImagem = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
)

const IconeCampanha = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
)

const Seta = () => (
  <svg className="topico__seta" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
)

const topicos = [
  {
    titulo: 'Carregar imagens',
    descricao: 'Envie e organize as fotos dos seus produtos.',
    href: '#area-do-vendedor/carregar-imagens',
    Icone: IconeImagem,
  },
  {
    titulo: 'Cadastrar Campanhas',
    descricao: 'Crie promoções, defina descontos e período de validade.',
    href: '#area-do-vendedor/cadastrar-campanhas',
    Icone: IconeCampanha,
  },
]

export default function AreaVendedor() {
  return (
    <section className="vendedor" aria-labelledby="vendedor-titulo">
      <nav className="vendedor__breadcrumb" aria-label="Você está em">
        <a href="#">Início</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Área do Vendedor</span>
      </nav>

      <header className="vendedor__cabecalho">
        <h1 id="vendedor-titulo">Área do Vendedor</h1>
        <p>Escolha o que você quer fazer.</p>
      </header>

      <ul className="topicos">
        {topicos.map(({ titulo, descricao, href, Icone }) => (
          <li key={titulo}>
            <a href={href} className="topico">
              <span className="topico__icone">
                <Icone />
              </span>
              <span className="topico__texto">
                <span className="topico__titulo">{titulo}</span>
                <span className="topico__descricao">{descricao}</span>
              </span>
              <Seta />
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
