"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import "./Header.css";
import logo from "@/assets/logo-jlk.png";
import { useCarrinho } from "@/context/Carrinho";

const opcoes = [{ label: "Black Friday", href: "/#black-friday" }];

// Opções fixadas no rodapé do menu lateral
const opcoesRodape = [{ label: "Área do Vendedor", href: "/area-do-vendedor" }];

// Abre o menu de compartilhamento nativo do celular (WhatsApp, Instagram, etc.).
// Se o navegador não tiver esse menu, copia o link e avisa "Link copiado".
function BotaoCompartilhar() {
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(""), 2000);
    return () => clearTimeout(id);
  }, [aviso]);

  const compartilhar = async () => {
    const dados = {
      title: document.title,
      text: "Olha o que encontrei na JLK Fitness e Casual:",
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(dados);
      } catch {
        // a pessoa fechou o menu sem compartilhar — nada a fazer
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(dados.url);
      setAviso("Link copiado");
    } catch {
      setAviso("Não foi possível compartilhar");
    }
  };

  return (
    <>
      <button
        type="button"
        className="header__compartilhar"
        aria-label="Compartilhar esta página"
        onClick={compartilhar}
      >
        {/* Seta saindo da caixa (padrão de compartilhar no celular) */}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 15V3" />
          <path d="M7.5 7.5 12 3l4.5 4.5" />
          <path d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2" />
        </svg>
      </button>
      <span className="header__aviso" role="status" hidden={!aviso}>
        {aviso}
      </span>
    </>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const { quantidadeTotal } = useCarrinho();
  const botaoRef = useRef(null);
  const drawerRef = useRef(null);

  const fecharMenu = () => {
    setMenuAberto(false);
    botaoRef.current?.focus();
  };

  // Fecha com Esc, trava a rolagem da página e leva o foco para o menu
  useEffect(() => {
    if (!menuAberto) return;
    document.body.classList.add("menu-aberto");
    drawerRef.current?.querySelector("a")?.focus();

    const aoTeclar = (e) => e.key === "Escape" && fecharMenu();
    window.addEventListener("keydown", aoTeclar);
    return () => {
      document.body.classList.remove("menu-aberto");
      window.removeEventListener("keydown", aoTeclar);
    };
  }, [menuAberto]);

  // Fecha o menu ao trocar de página
  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  const ativo = (href) => !href.includes("#") && pathname.startsWith(href);

  const renderLinkMenu = (op) => (
    <Link
      key={op.label}
      href={op.href}
      className="header__drawer-link"
      aria-current={ativo(op.href) ? "page" : undefined}
      onClick={() => setMenuAberto(false)}
    >
      {op.label}
    </Link>
  );

  return (
    <header className="header">
      <button
        ref={botaoRef}
        className={`header__menu-btn ${menuAberto ? "is-aberto" : ""}`}
        aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
        aria-expanded={menuAberto}
        aria-controls="menu-lateral"
        onClick={() => (menuAberto ? fecharMenu() : setMenuAberto(true))}
      >
        <span />
        <span />
        <span />
      </button>

      <Link
        href="/"
        className="header__logo"
        aria-label="JLK Fitness e Casual — página inicial"
      >
        <Image src={logo} alt="JLK" priority sizes="110px" />
      </Link>

      <nav className="header__nav" aria-label="Principal">
        {opcoes.map((op) => (
          <Link
            key={op.label}
            href={op.href}
            className="header__link"
            aria-current={ativo(op.href) ? "page" : undefined}
          >
            {op.label}
          </Link>
        ))}
      </nav>

      <BotaoCompartilhar />

      <Link
        href="/carrinho"
        className="header__carrinho"
        aria-label={`Carrinho: ${quantidadeTotal} ${quantidadeTotal === 1 ? "item" : "itens"}`}
        aria-current={pathname === "/carrinho" ? "page" : undefined}
      >
        {/* Carrinho de supermercado */}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2 3h2.5l2.6 11.2a1 1 0 0 0 1 .8h9.3a1 1 0 0 0 1-.76L20.5 7H5.6" />
          <circle cx="9" cy="19.5" r="1.5" />
          <circle cx="17" cy="19.5" r="1.5" />
        </svg>
        {quantidadeTotal > 0 && (
          <span className="header__badge">{quantidadeTotal}</span>
        )}
      </Link>

      <div
        className={`header__overlay ${menuAberto ? "is-visivel" : ""}`}
        onClick={fecharMenu}
        aria-hidden="true"
      />
      <aside
        id="menu-lateral"
        ref={drawerRef}
        className={`header__drawer ${menuAberto ? "is-aberto" : ""}`}
        aria-label="Menu"
        inert={!menuAberto}
      >
        <nav className="header__drawer-nav">{opcoes.map(renderLinkMenu)}</nav>
        <nav className="header__drawer-rodape" aria-label="Vendedor">
          {opcoesRodape.map(renderLinkMenu)}
        </nav>
      </aside>
    </header>
  );
}
