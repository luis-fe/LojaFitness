'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import './Carrossel.css'
import Preco from '@/components/Preco'

const INTERVALO = 4000 // tempo de cada passagem (ms)

// Quantos slides aparecem ao mesmo tempo, conforme a largura da tela
function useSlidesPorVez() {
  const consulta = '(min-width: 768px)'
  const [porVez, setPorVez] = useState(1) // no servidor não há tela: começa com 1
  useEffect(() => {
    const mq = window.matchMedia(consulta)
    const atualizar = () => setPorVez(mq.matches ? 2 : 1)
    atualizar()
    mq.addEventListener('change', atualizar)
    return () => mq.removeEventListener('change', atualizar)
  }, [])
  return porVez
}

const movimentoReduzido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
  const itens = (produtos ?? buscados ?? []).map((p) => ({ ...p, href: `/produto/${p.slug}` }))
  const total = Math.max(itens.length, 1)
  const porVez = useSlidesPorVez()
  const [indice, setIndice] = useState(0)
  const [animar, setAnimar] = useState(true)
  const [pausado, setPausado] = useState(false)
  const voltarPendente = useRef(false)
  const toqueInicio = useRef(null)

  // Cópias dos primeiros slides no fim criam o efeito de passagem contínua
  const slides = [...itens, ...itens.slice(0, porVez)]

  const proximo = useCallback(() => {
    setAnimar(true)
    setIndice((i) => Math.min(i + 1, total))
  }, [total])

  const anterior = () => {
    if (indice === 0) {
      // Salta (sem animação) para as cópias e depois volta uma posição
      voltarPendente.current = true
      setAnimar(false)
      setIndice(total)
    } else {
      setAnimar(true)
      setIndice((i) => i - 1)
    }
  }

  const irPara = (i) => {
    setAnimar(true)
    setIndice(i)
  }

  // Ao chegar nas cópias, volta para o início sem o usuário perceber
  const aoTerminarTransicao = () => {
    if (indice >= total) {
      setAnimar(false)
      setIndice(indice - total)
    }
  }

  // Reativa a animação logo após um salto invisível
  useEffect(() => {
    if (animar) return
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setAnimar(true)
        if (voltarPendente.current) {
          voltarPendente.current = false
          setIndice((i) => i - 1)
        }
      })
    )
    return () => cancelAnimationFrame(id)
  }, [animar])

  // Passagem automática (pausa com mouse em cima, foco ou aba escondida)
  useEffect(() => {
    if (pausado || movimentoReduzido()) return
    const id = setInterval(() => {
      if (!document.hidden) proximo()
    }, INTERVALO)
    return () => clearInterval(id)
  }, [pausado, proximo])

  // Gestos de arrastar no celular
  const aoTocar = (e) => (toqueInicio.current = e.touches[0].clientX)
  const aoSoltar = (e) => {
    if (toqueInicio.current === null) return
    const delta = e.changedTouches[0].clientX - toqueInicio.current
    toqueInicio.current = null
    if (Math.abs(delta) > 40) (delta < 0 ? proximo : anterior)()
  }

  if (!itens.length) return null // sem produtos visíveis no cadastro

  const ativo = indice % total

  return (
    <section
      id={ancora ? 'novidades' : undefined}
      className="carrossel"
      aria-roledescription="carrossel"
      aria-label={titulo || 'Produtos'}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <div className="carrossel__topo">
        <div>
          {selo && <span className="carrossel__selo">{selo}</span>}
          <h2 className="carrossel__titulo">{titulo}</h2>
        </div>
        <div className="carrossel__setas">
          <button type="button" onClick={anterior} aria-label="Slide anterior">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button type="button" onClick={proximo} aria-label="Próximo slide">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>

      <div className="carrossel__janela" onTouchStart={aoTocar} onTouchEnd={aoSoltar}>
        <ul
          className="carrossel__trilho"
          aria-live={pausado ? 'polite' : 'off'}
          onTransitionEnd={aoTerminarTransicao}
          style={{
            '--por-vez': porVez,
            transform: `translateX(-${(indice * 100) / porVez}%)`,
            transition: animar ? undefined : 'none',
          }}
        >
          {slides.map((item, i) => {
            const copia = i >= total
            return (
              <li
                key={`${item.nome}-${i}`}
                className="carrossel__slide"
                role="group"
                aria-roledescription="slide"
                aria-label={`${(i % total) + 1} de ${total}: ${item.nome}`}
                aria-hidden={copia || undefined}
                inert={copia}
              >
                <Link href={item.href} className="carrossel__card">
                  <div className="carrossel__imagem">
                    <img src={item.imagem} alt={`${item.nome} JLK`} loading={i < 2 ? 'eager' : 'lazy'} decoding="async" />
                  </div>
                  <div className="carrossel__legenda">
                    <span className="carrossel__nome">
                      {item.nome}
                      <small>
                        <Preco produto={item} />
                      </small>
                    </span>
                    <span className="carrossel__cta">Comprar</span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="carrossel__pontos">
        {itens.map((item, i) => (
          <button
            key={item.nome}
            type="button"
            className={i === ativo ? 'is-ativo' : ''}
            aria-label={`Ir para ${item.nome}`}
            aria-current={i === ativo || undefined}
            onClick={() => irPara(i)}
          />
        ))}
      </div>
    </section>
  )
}
