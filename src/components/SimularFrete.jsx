'use client'

import { useEffect, useState } from 'react'
import './SimularFrete.css'
import { formatarPreco } from '@/lib/produtos'

// Simulação de frete pelo Melhor Envio (produtos com "calcula frete" ligado no cadastro).
// Usada nos "Dados para entrega": o botão fica ao lado do CEP do cliente e o resultado abaixo dos dados.
//   const frete = useSimularFrete(itens, cep)   itens: [{ slug, quantidade }]
//   <button onClick={frete.simular}>…</button>   <ResultadoFrete {...frete} />
export function useSimularFrete(itens, cep) {
  const [estado, setEstado] = useState({ carregando: false, opcoes: null, erro: null })
  const digitos = String(cep ?? '').replace(/\D/g, '')
  const chaveItens = JSON.stringify(itens ?? [])

  // CEP ou produtos mudaram: o resultado anterior não vale mais
  useEffect(() => setEstado({ carregando: false, opcoes: null, erro: null }), [digitos, chaveItens])

  const simular = async () => {
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

  return { ...estado, simular, pronto: digitos.length === 8 }
}

export function ResultadoFrete({ id, carregando, opcoes, erro }) {
  return (
    <div id={id} className="simular-frete" aria-live="polite" hidden={!carregando && !opcoes && !erro}>
      {carregando && <p className="simular-frete__nota">Calculando o frete…</p>}
      {erro && <p className="simular-frete__erro">{erro}</p>}
      {opcoes && !opcoes.length && <p className="simular-frete__nota">Nenhuma opção de entrega para este CEP. Combine o frete pelo WhatsApp.</p>}
      {opcoes?.length > 0 && (
        <>
          <p className="simular-frete__rotulo">Opções de frete</p>
          <ul className="simular-frete__opcoes">
            {opcoes.map((o) => (
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
  )
}
