import { useCallback, useEffect, useRef, useState } from 'react'
import './Carrossel.css'
import conjuntoCalca from '../assets/conjunto-calca.jpg'
import conjuntoShort from '../assets/conjunto-short.jpg'
import conjuntoBermuda from '../assets/conjunto-bermuda.jpg'

const itens = [
  { nome: 'Conjunto Calça', imagem: conjuntoCalca, href: '#produto/conjunto-calca' },
  { nome: 'Conjunto Short', imagem: conjuntoShort, href: '#produto/conjunto-short' },
  { nome: 'Conjunto Bermuda', imagem: conjuntoBermuda, href: '#produto/conjunto-bermuda' },
]

const INTERVALO = 4000 // tempo de cada passagem (ms)

// Quantos slides aparecem ao mesmo tempo, conforme a largura da tela
function useSlidesPorVez() {
  const consulta = '(min-width: 768px)'
  const [porVez, setPorVez] = useState(() => (window.matchMedia(consulta).matches ? 2 : 1))
  useEffect(() => {
    const mq = window.matchMedia(consulta)
    const atualizar = () => setPorVez(mq.matches ? 2 : 1)
    mq.addEventListener('change', atualizar)
    return () => mq.removeEventListener('change', atualizar)
  }, [])
  return porVez
}

const movimentoReduzido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Carrossel() {
  const total = itens.length
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

  const ativo = indice % total

  return (
    <section
      id="novidades"
      className="carrossel"
      aria-roledescription="carrossel"
      aria-label="Novidades"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <div className="carrossel__topo">
        <div>
          <span className="carrossel__selo">Lançamentos</span>
          <h2 className="carrossel__titulo">Novidades</h2>
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
                inert={copia ? '' : undefined}
              >
                <a href={item.href} className="carrossel__card">
                  <div className="carrossel__imagem">
                    <img
                      src={item.imagem}
                      alt={`${item.nome} azul JLK`}
                      width="900"
                      height="900"
                      loading="lazy"
                    />
                  </div>
                  <div className="carrossel__legenda">
                    <span>{item.nome}</span>
                    <span className="carrossel__cta">Ver produto</span>
                  </div>
                </a>
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
