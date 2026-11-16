'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import './Erro.css'

// =============================================================================
//  MODAL PADRÃO DE ERRO
//
//    ⚠ Erro
//    ────────────────
//    Mensagem de erro
//                [ OK ]
//
//  Uso em qualquer tela:  const { mostrarErro } = useErro()
//                         mostrarErro('Não foi possível salvar.')
//                         mostrarErro(['Erro 1', 'Erro 2'])            (lista)
//                         mostrarErro('Mensagem', { titulo: 'Atenção' })
//  Erros de preenchimento de um campo continuam aparecendo embaixo do próprio campo.
// =============================================================================

const ErroContexto = createContext({ mostrarErro: () => {} })

function IconeErro() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7v6" />
      <path d="M12 16.5v.5" />
    </svg>
  )
}

function ModalErro({ erro, aoFechar }) {
  const ref = useRef(null)
  const okRef = useRef(null)

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (erro && !dialogo.open) {
      dialogo.showModal() // fica por cima de qualquer outra janela aberta
      okRef.current?.focus()
    }
    if (!erro && dialogo.open) dialogo.close()
  }, [erro])

  const mensagens = Array.isArray(erro?.mensagem) ? erro.mensagem : [erro?.mensagem]

  return (
    <dialog
      ref={ref}
      className="modal-erro"
      role="alertdialog"
      aria-labelledby="modal-erro-titulo"
      aria-describedby="modal-erro-mensagem"
      onCancel={(e) => {
        e.preventDefault()
        aoFechar()
      }}
    >
      {erro && (
        <div className="modal-erro__caixa">
          <h2 id="modal-erro-titulo" className="modal-erro__titulo">
            <span className="modal-erro__icone">
              <IconeErro />
            </span>
            {erro.titulo}
          </h2>
          <div id="modal-erro-mensagem" className="modal-erro__mensagem">
            {mensagens.length > 1 ? (
              <ul>
                {mensagens.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            ) : (
              <p>{mensagens[0]}</p>
            )}
          </div>
          <div className="modal-erro__acoes">
            <button ref={okRef} type="button" className="modal-erro__ok" onClick={aoFechar}>
              OK
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}

export function ErroProvider({ children }) {
  const [erro, setErro] = useState(null)

  const mostrarErro = useCallback((mensagem, { titulo = 'Erro' } = {}) => {
    if (!mensagem || (Array.isArray(mensagem) && !mensagem.length)) return
    setErro({ mensagem, titulo })
  }, [])

  const valor = useMemo(() => ({ mostrarErro }), [mostrarErro])

  return (
    <ErroContexto.Provider value={valor}>
      {children}
      <ModalErro erro={erro} aoFechar={() => setErro(null)} />
    </ErroContexto.Provider>
  )
}

export const useErro = () => useContext(ErroContexto)
