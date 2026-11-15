'use client'

import { useEffect, useRef } from 'react'
import './Modal.css'

// Janela modal usando o <dialog> nativo do navegador
// (foco preso dentro da janela, fecha com Esc, acessível a leitores de tela).
export default function Modal({ aberto, aoFechar, titulo, children, largura = 520 }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (aberto && !dialogo.open) dialogo.showModal()
    if (!aberto && dialogo.open) dialogo.close()
  }, [aberto])

  return (
    <dialog
      ref={ref}
      className="modal"
      style={{ '--modal-largura': `${largura}px` }}
      aria-labelledby="modal-titulo"
      onClose={aoFechar}
      onCancel={(e) => {
        e.preventDefault()
        aoFechar()
      }}
      // Clique no fundo escuro fecha
      onClick={(e) => e.target === ref.current && aoFechar()}
    >
      {aberto && (
        <div className="modal__conteudo">
          <div className="modal__topo">
            <h2 id="modal-titulo" className="modal__titulo">
              {titulo}
            </h2>
            <button type="button" className="modal__fechar" onClick={aoFechar} aria-label="Fechar">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
