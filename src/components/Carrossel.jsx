'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import './Carrossel.css'
import Preco from '@/components/Preco'
import { resumoVariacoes } from '@/components/blocos/AnuncioProduto'

const movimentoReduzido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Desconto do "de X por Y", em % (só quando o cadastro tem preço anterior)
const desconto = (p) => (p.precoAnterior ? Math.round((1 - p.preco / p.precoAnterior) * 100) : 0)

// Vitrine de produtos: prateleira que o cliente passa com o dedo (ou com as setas, no computador).
// Vários produtos aparecem de uma vez, cada um com foto, nome e preço em destaque; nada se move sozinho.
// produtos: catálogo vindo do servidor (página inicial). Sem ele (prévia do construtor), busca em /api/produtos.
export default function Carrossel({ produtos, selo = 'Lançamentos', titulo = 'Novidades', ancora = true }) {
  const [buscados, setBuscados] = useState(null)
  useEffect(() => {
    if (produtos) return
    fetch('/api/produtos')
      .then((r) => r.json())
      .then((d) => setBuscados(d.produtos ?? []))
      .catch(() => setBuscados([]))
  }, [produtos])
  const itens = produtos ?? buscados ?? []

  // Posição da rolagem: liga/desliga as setas e move a barra de progresso
  const trilho = useRef(null)
  const [rolagem, setRolagem] = useState({ inicio: 0, tamanho: 1, voltar: false, avancar: false })
  const medir = useCallback(() => {
    const el = trilho.current
    if (!el) return
    const sobra = el.scrollWidth - el.clientWidth
    setRolagem({
      inicio: el.scrollWidth ? el.scrollLeft / el.scrollWidth : 0,
      tamanho: el.scrollWidth ? el.clientWidth / el.scrollWidth : 1,
      voltar: el.scrollLeft > 4,
      avancar: el.scrollLeft < sobra - 4,
    })
  }, [])

  useEffect(() => {
    const el = trilho.current
    if (!el) return
    medir()
    let quadro = 0
    const aoRolar = () => {
      cancelAnimationFrame(quadro)
      quadro = requestAnimationFrame(medir)
    }
    el.addEventListener('scroll', aoRolar, { passive: true })
    const observador = new ResizeObserver(medir)
    observador.observe(el)
    return () => {
      cancelAnimationFrame(quadro)
      el.removeEventListener('scroll', aoRolar)
      observador.disconnect()
    }
  }, [medir, itens.length])

  // As setas passam uma "tela" de produtos por vez
  const passar = (sentido) => {
    const el = trilho.current
    if (!el) return
    el.scrollBy({ left: sentido * el.clientWidth, behavior: movimentoReduzido() ? 'auto' : 'smooth' })
  }

  if (!itens.length) return null // sem produtos visíveis no cadastro

  const rola = rolagem.voltar || rolagem.avancar

  return (
    <section id={ancora ? 'novidades' : undefined} className="carrossel" aria-label={titulo || 'Produtos'}>
      <div className="carrossel__topo">
        <div>
          {selo && <span className="carrossel__selo">{selo}</span>}
          <h2 className="carrossel__titulo">{titulo}</h2>
        </div>
        {rola && (
          <div className="carrossel__setas">
            <button type="button" onClick={() => passar(-1)} disabled={!rolagem.voltar} aria-label="Produtos anteriores">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <button type="button" onClick={() => passar(1)} disabled={!rolagem.avancar} aria-label="Próximos produtos">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>
        )}
      </div>

      <ul className="carrossel__trilho" ref={trilho}>
        {itens.map((item, i) => {
          const { cores, tamanhos, esgotado } = resumoVariacoes(item)
          const off = desconto(item)
          return (
            <li key={item.slug} className="carrossel__slide">
              <Link href={`/produto/${item.slug}`} className={`carrossel__card ${esgotado ? 'is-esgotado' : ''}`}>
                <div className="carrossel__imagem">
                  <img src={item.imagem} alt={`${item.nome} JLK`} loading={i < 4 ? 'eager' : 'lazy'} decoding="async" />
                  {esgotado && <span className="carrossel__etiqueta">Esgotado</span>}
                  {!esgotado && off > 0 && (
                    <span className="carrossel__etiqueta carrossel__etiqueta--oferta">
                      <span aria-hidden="true">-{off}%</span>
                      <span className="sr-only">{off}% de desconto</span>
                    </span>
                  )}
                </div>
                <div className="carrossel__legenda">
                  <span className="carrossel__nome">{item.nome}</span>
                  <span className="carrossel__preco">
                    <Preco produto={item} />
                  </span>
                  {!esgotado && (
                    <span className="carrossel__variacoes">
                      <span className="carrossel__cores" aria-label={`Cores: ${cores.map((c) => c.nome).join(', ')}`}>
                        {cores.map((c) => (
                          <span key={c.codigo} className="carrossel__cor" style={{ background: c.hex }} title={c.nome} />
                        ))}
                      </span>
                      <span aria-label={`Tamanhos: ${tamanhos.join(', ')}`}>{tamanhos.join(' ')}</span>
                    </span>
                  )}
                </div>
              </Link>
            </li>
          )
        })}
      </ul>

      {rola && (
        <div className="carrossel__progresso" aria-hidden="true">
          <span style={{ left: `${rolagem.inicio * 100}%`, width: `${rolagem.tamanho * 100}%` }} />
        </div>
      )}
    </section>
  )
}
