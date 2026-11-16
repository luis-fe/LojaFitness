'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import './PaginaVendedor.css'

// Moldura padrão das telas da Área do Vendedor: trilha de navegação, título e descrição
// A trilha começa em "Início" (menu principal da Área do Vendedor): Início / Perfil / Vendedores
// trilha: níveis intermediários, ex.: [{ href: '/area-do-vendedor/perfil', rotulo: 'Perfil' }]
// fixarTopo: trilha + título + ações ficam congelados no topo ao rolar a página
export default function PaginaVendedor({ titulo, descricao, acoes, largura = 720, trilha = [], fixarTopo = false, children }) {
  const secaoRef = useRef(null)
  const topoRef = useRef(null)

  // Informa a altura do topo congelado (--topo-fixo-altura) para que cabeçalhos de tabela
  // também "grudem" logo abaixo dele, em vez de ficarem escondidos atrás
  useEffect(() => {
    if (!fixarTopo || !topoRef.current) return
    const observador = new ResizeObserver(([item]) => {
      secaoRef.current?.style.setProperty('--topo-fixo-altura', `${Math.ceil(item.borderBoxSize[0].blockSize)}px`)
    })
    observador.observe(topoRef.current)
    return () => observador.disconnect()
  }, [fixarTopo])

  return (
    <section ref={secaoRef} className="pagina-vendedor" style={{ '--pagina-largura': `${largura}px` }} aria-labelledby="pagina-titulo">
      <div ref={topoRef} className={fixarTopo ? 'pagina-vendedor__topo is-fixo' : 'pagina-vendedor__topo'}>
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
      </div>

      {children}
    </section>
  )
}
