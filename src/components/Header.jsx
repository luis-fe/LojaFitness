'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import './Header.css'
import logo from '@/assets/logo-jlk.png'
import { useCarrinho } from '@/context/Carrinho'

const opcoes = [{ label: 'Black Friday', href: '/#black-friday' }]

// Opções fixadas no rodapé do menu lateral
const opcoesRodape = [{ label: 'Área do Vendedor', href: '/area-do-vendedor' }]

export default function Header() {
  const pathname = usePathname()
  const [menuAberto, setMenuAberto] = useState(false)
  const { quantidadeTotal } = useCarrinho()
  const botaoRef = useRef(null)
  const drawerRef = useRef(null)

  const fecharMenu = () => {
    setMenuAberto(false)
    botaoRef.current?.focus()
  }

  // Fecha com Esc, trava a rolagem da página e leva o foco para o menu
  useEffect(() => {
    if (!menuAberto) return
    document.body.classList.add('menu-aberto')
    drawerRef.current?.querySelector('a')?.focus()

    const aoTeclar = (e) => e.key === 'Escape' && fecharMenu()
    window.addEventListener('keydown', aoTeclar)
    return () => {
      document.body.classList.remove('menu-aberto')
      window.removeEventListener('keydown', aoTeclar)
    }
  }, [menuAberto])

  // Fecha o menu ao trocar de página
  useEffect(() => {
    setMenuAberto(false)
  }, [pathname])

  const ativo = (href) => !href.includes('#') && pathname.startsWith(href)

  const renderLinkMenu = (op) => (
    <Link
      key={op.label}
      href={op.href}
      className="header__drawer-link"
      aria-current={ativo(op.href) ? 'page' : undefined}
      onClick={() => setMenuAberto(false)}
    >
      {op.label}
    </Link>
  )

  return (
    <header className="header">
      <button
        ref={botaoRef}
        className={`header__menu-btn ${menuAberto ? 'is-aberto' : ''}`}
        aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={menuAberto}
        aria-controls="menu-lateral"
        onClick={() => (menuAberto ? fecharMenu() : setMenuAberto(true))}
      >
        <span />
        <span />
        <span />
      </button>

      <Link href="/" className="header__logo" aria-label="JLK Fitness e Casual — página inicial">
        <Image src={logo} alt="JLK" priority sizes="110px" />
      </Link>

      <nav className="header__nav" aria-label="Principal">
        {opcoes.map((op) => (
          <Link
            key={op.label}
            href={op.href}
            className="header__link"
            aria-current={ativo(op.href) ? 'page' : undefined}
          >
            {op.label}
          </Link>
        ))}
      </nav>

      <Link
        href="/carrinho"
        className="header__carrinho"
        aria-label={`Carrinho: ${quantidadeTotal} ${quantidadeTotal === 1 ? 'item' : 'itens'}`}
        aria-current={pathname === '/carrinho' ? 'page' : undefined}
      >
        {/* Carrinho de supermercado */}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2 3h2.5l2.6 11.2a1 1 0 0 0 1 .8h9.3a1 1 0 0 0 1-.76L20.5 7H5.6" />
          <circle cx="9" cy="19.5" r="1.5" />
          <circle cx="17" cy="19.5" r="1.5" />
        </svg>
        {quantidadeTotal > 0 && <span className="header__badge">{quantidadeTotal}</span>}
      </Link>

      <div
        className={`header__overlay ${menuAberto ? 'is-visivel' : ''}`}
        onClick={fecharMenu}
        aria-hidden="true"
      />
      <aside
        id="menu-lateral"
        ref={drawerRef}
        className={`header__drawer ${menuAberto ? 'is-aberto' : ''}`}
        aria-label="Menu"
        inert={!menuAberto}
      >
        <nav className="header__drawer-nav">
          {opcoes.map(renderLinkMenu)}
        </nav>
        <nav className="header__drawer-rodape" aria-label="Vendedor">
          {opcoesRodape.map(renderLinkMenu)}
        </nav>
      </aside>
    </header>
  )
}
