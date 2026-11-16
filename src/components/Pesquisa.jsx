'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import './Pesquisa.css'
import Preco from '@/components/Preco'
import { TIPOS_SELO, TIPO_SELO_PADRAO } from '@/lib/selos'
import { buscarProdutos, etiquetasProduto } from '@/lib/busca'

// Catálogo e selos buscados ao abrir a pesquisa (sem cache: produto novo aparece na hora)
async function carregar() {
  const [produtos, selos] = await Promise.all([
    fetch('/api/produtos', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { produtos: [] })),
    fetch('/api/selos', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { selos: [] })),
  ])
  return { produtos: produtos.produtos ?? [], selos: selos.selos ?? [] }
}

const LIMITE = 30

// Lupa no header (web e celular): abre um painel com a busca por nome, descrição, categoria ou campanha
export default function Pesquisa() {
  const pathname = usePathname()
  const [aberta, setAberta] = useState(false)
  const [termo, setTermo] = useState('')
  const [dados, setDados] = useState(null) // { produtos, selos }
  const [falhou, setFalhou] = useState(false)
  const botaoRef = useRef(null)
  const campoRef = useRef(null)

  const fechar = (devolverFoco = true) => {
    setAberta(false)
    if (devolverFoco) botaoRef.current?.focus()
  }

  // Ao abrir: carrega o catálogo, foca o campo, trava a rolagem e fecha com Esc
  useEffect(() => {
    if (!aberta) return
    let ativo = true
    setFalhou(false)
    carregar()
      .then((d) => ativo && setDados(d))
      .catch(() => ativo && setFalhou(true))
    campoRef.current?.focus()
    document.body.classList.add('pesquisa-aberta')
    const aoTeclar = (e) => e.key === 'Escape' && fechar()
    window.addEventListener('keydown', aoTeclar)
    return () => {
      ativo = false
      document.body.classList.remove('pesquisa-aberta')
      window.removeEventListener('keydown', aoTeclar)
    }
  }, [aberta])

  // Escolheu um produto (trocou de página): fecha
  useEffect(() => {
    setAberta(false)
  }, [pathname])

  const resultados = useMemo(() => (dados ? buscarProdutos(dados.produtos, termo) : []), [dados, termo])
  const temTermo = termo.trim().length > 0

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        className="header__pesquisar"
        aria-label="Pesquisar produtos"
        aria-expanded={aberta}
        aria-controls="pesquisa"
        onClick={() => (aberta ? fechar() : setAberta(true))}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m15.5 15.5 5 5" />
        </svg>
      </button>

      {aberta && (
        <>
          <div className="pesquisa__fundo" onClick={() => fechar()} aria-hidden="true" />
          <div id="pesquisa" className="pesquisa" role="dialog" aria-modal="true" aria-label="Pesquisar produtos">
            <form className="pesquisa__barra" role="search" onSubmit={(e) => e.preventDefault()}>
              <svg className="pesquisa__lupa" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m15.5 15.5 5 5" />
              </svg>
              <label htmlFor="pesquisa-campo" className="sr-only">
                Pesquisar por produto, categoria ou campanha
              </label>
              <input
                ref={campoRef}
                id="pesquisa-campo"
                type="search"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Buscar produto, categoria ou campanha"
                autoComplete="off"
                enterKeyHint="search"
                maxLength={60}
              />
              {temTermo && (
                <button type="button" className="pesquisa__limpar" onClick={() => (setTermo(''), campoRef.current?.focus())}>
                  Limpar
                </button>
              )}
              <button type="button" className="pesquisa__fechar" aria-label="Fechar pesquisa" onClick={() => fechar()}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </form>

            <div className="pesquisa__corpo">
              {falhou && <p className="pesquisa__vazio">Não foi possível carregar os produtos. Verifique sua internet.</p>}
              {!falhou && !dados && <p className="pesquisa__vazio">Carregando…</p>}

              {/* Sem termo: atalhos para as categorias e campanhas */}
              {dados && !temTermo && (
                <div className="pesquisa__atalhos">
                  {TIPOS_SELO.map((tipo) => {
                    const doTipo = dados.selos.filter((s) => (s.tipo ?? TIPO_SELO_PADRAO) === tipo.id)
                    if (!doTipo.length) return null
                    return (
                      <section key={tipo.id} aria-label={tipo.plural}>
                        <h2 className="pesquisa__titulo">{tipo.plural}</h2>
                        <div className="pesquisa__chips">
                          {doTipo.map((s) => (
                            <Link key={s.slug} href={`/selo/${s.slug}`} className="pesquisa__chip" onClick={() => fechar(false)}>
                              {s.nome}
                            </Link>
                          ))}
                        </div>
                      </section>
                    )
                  })}
                  {!dados.selos.length && <p className="pesquisa__vazio">Digite o nome, a categoria ou a campanha do produto.</p>}
                </div>
              )}

              {dados && temTermo && (
                <>
                  <p className="pesquisa__contagem" aria-live="polite">
                    {resultados.length
                      ? `${resultados.length} ${resultados.length === 1 ? 'produto encontrado' : 'produtos encontrados'}`
                      : `Nenhum produto encontrado para "${termo.trim()}".`}
                  </p>
                  <ul className="pesquisa__lista">
                    {resultados.slice(0, LIMITE).map((p) => (
                      <li key={p.slug}>
                        <Link href={`/produto/${p.slug}`} className="pesquisa__item" onClick={() => fechar(false)}>
                          <img src={p.imagem} alt="" loading="lazy" />
                          <span className="pesquisa__info">
                            <strong>{p.nome}</strong>
                            {etiquetasProduto(p).map((e) => (
                              <small key={e.rotulo} className={`pesquisa__etiqueta pesquisa__etiqueta--${e.tipo}`}>
                                {e.rotulo}
                              </small>
                            ))}
                            <Preco produto={p} />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {!resultados.length && <p className="pesquisa__dica">Tente outra palavra, como o tipo da peça (legging, top) ou o nome da campanha.</p>}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
