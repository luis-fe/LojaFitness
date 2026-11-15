'use client'

import { useId, useState } from 'react'
import './Formulario.css'
import { IconeOlho, IconeOlhoFechado } from '@/components/Icones'

// Campo de formulário acessível: rótulo, dica, mensagem de erro e opção de mostrar senha.
//   <Campo rotulo="Telefone" valor={tel} aoMudar={setTel} erro={erros.telefone} />
export default function Campo({
  rotulo,
  valor,
  aoMudar,
  erro,
  dica,
  opcional = false,
  tipo = 'text',
  mascara,
  ...resto
}) {
  const id = useId()
  const [mostrar, setMostrar] = useState(false)
  const ehSenha = tipo === 'password'
  const descricao = [erro && `${id}-erro`, dica && `${id}-dica`].filter(Boolean).join(' ') || undefined

  const input = (
    <input
      id={id}
      type={ehSenha && mostrar ? 'text' : tipo}
      value={valor ?? ''}
      onChange={(e) => aoMudar(mascara ? mascara(e.target.value) : e.target.value)}
      aria-invalid={erro ? true : undefined}
      aria-describedby={descricao}
      {...resto}
    />
  )

  return (
    <div className="campo">
      <label htmlFor={id}>
        {rotulo} {opcional && <span className="campo__opcional">(opcional)</span>}
      </label>
      {ehSenha ? (
        <div className="campo__senha">
          {input}
          <button
            type="button"
            className="campo__mostrar"
            onClick={() => setMostrar((v) => !v)}
            aria-pressed={mostrar}
            aria-label={mostrar ? `Ocultar ${rotulo.toLowerCase()}` : `Mostrar ${rotulo.toLowerCase()}`}
            title={mostrar ? 'Ocultar' : 'Mostrar'}
          >
            {mostrar ? <IconeOlhoFechado /> : <IconeOlho />}
          </button>
        </div>
      ) : (
        input
      )}
      {dica && !erro && (
        <span id={`${id}-dica`} className="campo__dica">
          {dica}
        </span>
      )}
      {erro && (
        <span id={`${id}-erro`} className="campo__erro">
          {erro}
        </span>
      )}
    </div>
  )
}
