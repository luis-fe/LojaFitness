'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { TIPOS_SELO, TIPO_SELO_PADRAO } from '@/lib/selos'
import './Header.css'
import logo from '@/assets/logo-jlk.png'
import { useCarrinho } from '@/context/Carrinho'
import { IconeLoja } from '@/components/Icones'


// Opções fixadas no rodapé do menu lateral
const opcoesRodape = [
  { label: 'Área do Vendedor', href: '/area-do-vendedor', Icone: IconeLoja },
  { label: 'Política de Privacidade', href: '/politica-de-privacidade' },
]

// Abre o menu de compartilhamento nativo do celular (WhatsApp, Instagram, etc.).
// Se o navegador não tiver esse menu, copia o link e avisa "Link copiado".
function BotaoCompartilhar() {
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    if (!aviso) return
    const id = setTimeout(() => setAviso(''), 2000)
    return () => clearTimeout(id)
  }, [aviso])

  const compartilhar = async () => {
    const dados = {
      title: document.title,
      text: 'Olha o que encontrei na JLK Fitness e Casual:',
      url: window.location.href,
    }
    if (navigator.share) {
      try {
        await navigator.share(dados)
      } catch {
        // a pessoa fechou o menu sem compartilhar — nada a fazer
      }
      return
    }
    try {
      await navigator.clipboard.writeText(dados.url)
      setAviso('Link copiado')
    } catch {
      setAviso('Não foi possível compartilhar')
    }
  }

  return (
    <>
      <button type="button" className="header__compartilhar" aria-label="Compartilhar esta página" onClick={compartilhar}>
        {/* Três pontos ligados (símbolo universal de compartilhar) */}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="18" cy="5" r="2.6" />
          <circle cx="6" cy="12" r="2.6" />
          <circle cx="18" cy="19" r="2.6" />
          <path d="m8.3 10.8 7.4-4.4M8.3 13.2l7.4 4.4" />
        </svg>
      </button>
      <span className="header__aviso" role="status" hidden={!aviso}>
        {aviso}
      </span>
    </>
  )
}

export default function Header() {
  const pathname = usePathname()
  // Selos dos produtos: um item do menu para cada selo existente, em dois grupos —
  // Categorias (ex.: Camiseta) e Campanhas (ex.: Black Friday). Cada item abre a página só com os produtos do selo.
  const [opcoes, setOpcoes] = useState([])

  // O Header não é remontado ao navegar; por isso busca de novo ao trocar de página e ao abrir o
  // menu — um selo colocado/retirado no cadastro aparece sem precisar recarregar o site.
  const [menuAberto, setMenuAberto] = useState(false)
  useEffect(() => {
    let ativo = true
    fetch('/api/selos', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && ativo && setOpcoes((d.selos ?? []).map((s) => ({ label: s.nome, href: `/selo/${s.slug}`, tipo: s.tipo }))))
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [pathname, menuAberto])
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
      {op.Icone && (
        <span className="header__drawer-icone">
          <op.Icone />
        </span>
      )}
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


      <BotaoCompartilhar />

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
        <nav className="header__drawer-nav" aria-label="Categorias e campanhas">
          {TIPOS_SELO.map((tipo) => {
            const doTipo = opcoes.filter((op) => (op.tipo ?? TIPO_SELO_PADRAO) === tipo.id)
            if (!doTipo.length) return null
            return (
              <div key={tipo.id} role="group" aria-label={tipo.plural}>
                <span className="header__drawer-titulo">{tipo.plural}</span>
                {doTipo.map(renderLinkMenu)}
              </div>
            )
          })}
        </nav>
        <nav className="header__drawer-rodape" aria-label="Mais opções">
          {opcoesRodape.map(renderLinkMenu)}
        </nav>
      </aside>
    </header>
  )
}
