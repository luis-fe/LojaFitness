import Link from 'next/link'
import './PaginaVendedor.css'

// Moldura padrão das telas da Área do Vendedor: trilha de navegação, título e descrição
// A trilha começa em "Início" (menu principal da Área do Vendedor): Início / Perfil / Vendedores
// trilha: níveis intermediários, ex.: [{ href: '/area-do-vendedor/perfil', rotulo: 'Perfil' }]
export default function PaginaVendedor({ titulo, descricao, acoes, largura = 720, trilha = [], children }) {
  return (
    <section className="pagina-vendedor" style={{ '--pagina-largura': `${largura}px` }} aria-labelledby="pagina-titulo">
      <nav className="pagina-vendedor__trilha" aria-label="Você está em">
        <Link href="/area-do-vendedor">Início</Link>
        <span aria-hidden="true">/</span>
        {trilha.map((nivel) => (
          <span key={nivel.href} className="pagina-vendedor__nivel">
            <Link href={nivel.href}>{nivel.rotulo}</Link>
            <span aria-hidden="true">/</span>
          </span>
        ))}
        <span aria-current="page">{titulo}</span>
      </nav>

      <header className="pagina-vendedor__cabecalho">
        <div>
          <h1 id="pagina-titulo">{titulo}</h1>
          {descricao && <p>{descricao}</p>}
        </div>
        {acoes && <div className="pagina-vendedor__acoes">{acoes}</div>}
      </header>

      {children}
    </section>
  )
}
