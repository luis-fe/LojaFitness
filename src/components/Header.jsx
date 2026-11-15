import { useEffect, useRef, useState } from 'react'
import './Header.css'

const opcoes = [{ label: 'Black Friday', href: '#black-friday' }]

// Opções que aparecem só no menu lateral
const opcoesMenuLateral = [
  ...opcoes,
  { label: 'Área do Vendedor', href: '#area-do-vendedor' },
]

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
        <nav>
          {opcoesMenuLateral.map((op) => (
            <a
              key={op.label}
              href={op.href}
              className="header__drawer-link"
              aria-current={ativo(op.href) ? 'page' : undefined}
              onClick={() => setMenuAberto(false)}
            >
              {op.label}
            </a>
          ))}
        </nav>
      </aside>
    </header>
  )
}
