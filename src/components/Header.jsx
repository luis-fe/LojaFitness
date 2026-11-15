import { useState } from 'react'
import './Header.css'

const opcoes = [{ label: 'Black Friday', href: '#black-friday' }]

// Opções que aparecem só no menu lateral
const opcoesMenuLateral = [
  ...opcoes,
  { label: 'Área do Vendedor', href: '#area-do-vendedor' },
]

export default function Header() {
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <header className="header">
      <button
        className="header__menu-btn"
        aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={menuAberto}
        onClick={() => setMenuAberto(!menuAberto)}
      >
        <span />
        <span />
        <span />
      </button>

      <nav className="header__nav">
        {opcoes.map((op) => (
          <a key={op.label} href={op.href} className="header__link">
            {op.label}
          </a>
        ))}
      </nav>

      {menuAberto && (
        <>
          <div className="header__overlay" onClick={() => setMenuAberto(false)} />
          <aside className="header__drawer">
            {opcoesMenuLateral.map((op) => (
              <a
                key={op.label}
                href={op.href}
                className="header__drawer-link"
                onClick={() => setMenuAberto(false)}
              >
                {op.label}
              </a>
            ))}
          </aside>
        </>
      )}
    </header>
  )
}
