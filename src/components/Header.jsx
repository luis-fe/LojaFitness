import { useEffect, useRef, useState } from 'react'
import './Header.css'
import logo from '../assets/logo-jlk.png'

const opcoes = [{ label: 'Black Friday', href: '#black-friday' }]

// Opções fixadas no rodapé do menu lateral
const opcoesRodape = [{ label: 'Área do Vendedor', href: '#area-do-vendedor' }]

export default function Header({ hashAtual = '' }) {
  const [menuAberto, setMenuAberto] = useState(false)
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

  const ativo = (href) => hashAtual.startsWith(href)

  const renderLinkMenu = (op) => (
    <a
      key={op.label}
      href={op.href}
      className="header__drawer-link"
      aria-current={ativo(op.href) ? 'page' : undefined}
      onClick={() => setMenuAberto(false)}
    >
      {op.label}
    </a>
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

      <a href="#" className="header__logo" aria-label="JLK Fitness e Casual — página inicial">
        <img src={logo} alt="JLK" width="440" height="106" />
      </a>

      <nav className="header__nav" aria-label="Principal">
        {opcoes.map((op) => (
          <a
            key={op.label}
            href={op.href}
            className="header__link"
            aria-current={ativo(op.href) ? 'page' : undefined}
          >
            {op.label}
          </a>
        ))}
      </nav>

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
        inert={menuAberto ? undefined : ''}
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
