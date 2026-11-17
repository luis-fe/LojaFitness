'use client'

import { useState } from 'react'
import './SimularFrete.css'
import { mascaraCep } from '@/lib/retirada'
import { formatarPreco } from '@/lib/produtos'

// "Simular frete": o cliente digita o CEP e vê as opções do Melhor Envio (preço e prazo).
// Só aparece para produtos com "calcula frete" ligado no cadastro.
//   itens: [{ slug, quantidade }]
export default function SimularFrete({ itens, idBase = 'frete' }) {
  const [cep, setCep] = useState('')
  const [estado, setEstado] = useState({ carregando: false, opcoes: null, erro: null })
  const digitos = cep.replace(/\D/g, '')

  const simular = async (e) => {
    e?.preventDefault()
    if (digitos.length !== 8) return setEstado({ carregando: false, opcoes: null, erro: 'Digite o CEP com 8 números.' })
    setEstado({ carregando: true, opcoes: null, erro: null })
    try {
      const r = await fetch('/api/frete/simular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cep: digitos, itens }),
      })
      const dados = await r.json().catch(() => ({}))
      if (!r.ok) return setEstado({ carregando: false, opcoes: null, erro: dados.erro || 'Não foi possível simular o frete.' })
      setEstado({ carregando: false, opcoes: dados.opcoes ?? [], erro: null })
    } catch {
      setEstado({ carregando: false, opcoes: null, erro: 'Sem conexão. Verifique sua internet e tente de novo.' })
    }
  }

  return (
    <div className="simular-frete">
      <label htmlFor={`${idBase}-cep`} className="simular-frete__rotulo">
        Simular frete
      </label>
      <div className="simular-frete__linha">
        <input
          id={`${idBase}-cep`}
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="00000-000"
          value={cep}
          onChange={(e) => setCep(mascaraCep(e.target.value))}
          onKeyDown={(e) => e.key === 'Enter' && simular(e)}
          aria-describedby={`${idBase}-resultado`}
        />
        <button type="button" onClick={simular} disabled={estado.carregando || digitos.length !== 8}>
          {estado.carregando ? 'Calculando…' : 'Simular frete'}
        </button>
      </div>
      <a className="simular-frete__ajuda" href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noopener noreferrer">
        Não sei meu CEP
      </a>
      <div id={`${idBase}-resultado`} aria-live="polite">
        {estado.erro && <p className="simular-frete__erro">{estado.erro}</p>}
        {estado.opcoes && !estado.opcoes.length && <p className="simular-frete__nota">Nenhuma opção de entrega para este CEP. Combine o frete pelo WhatsApp.</p>}
        {estado.opcoes?.length > 0 && (
          <>
            <ul className="simular-frete__opcoes">
              {estado.opcoes.map((o) => (
                <li key={o.id}>
                  <span>
                    <strong>{[o.empresa, o.nome].filter(Boolean).join(' ')}</strong>
                    {o.prazo && <small>Até {o.prazo} dia{o.prazo === 1 ? '' : 's'} úte{o.prazo === 1 ? 'il' : 'is'}</small>}
                  </span>
                  <b>{formatarPreco(o.preco)}</b>
                </li>
              ))}
            </ul>
            <p className="simular-frete__nota">Valores estimados. O frete final é confirmado pelo WhatsApp.</p>
          </>
        )}
      </div>
    </div>
  )
}
