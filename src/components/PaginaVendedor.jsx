import Link from 'next/link'
import './PaginaVendedor.css'

// Moldura padrão das telas da Área do Vendedor: trilha de navegação, título e descrição
export default function PaginaVendedor({ titulo, descricao, acoes, largura = 720, children }) {
  return (
    <section className="pagina-vendedor" style={{ '--pagina-largura': `${largura}px` }} aria-labelledby="pagina-titulo">
      <nav className="pagina-vendedor__trilha" aria-label="Você está em">
        <Link href="/">Início</Link>
        <span aria-hidden="true">/</span>
        <Link href="/area-do-vendedor">Área do Vendedor</Link>
        <span aria-hidden="true">/</span>
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
