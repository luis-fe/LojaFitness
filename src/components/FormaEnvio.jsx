'use client'

import { useEffect, useState } from 'react'
import './FormaEnvio.css'
import { FRETES } from '@/lib/frete'
import { enderecoCompleto, linkMapa } from '@/lib/retirada'

const RETIRAR = 1 // id de "Retirar c/ vendedor" na tabela frete

// Os locais de retirada são buscados uma vez só e reaproveitados (carrinho e página do produto)
let buscaLocais = null
const buscarLocais = () =>
  (buscaLocais ??= fetch('/api/retirada')
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((d) => d.locais ?? [])
    .catch(() => {
      buscaLocais = null // falhou: tenta de novo na próxima vez
      return []
    }))

// Pino de mapa
const IconeMapa = () => (
  <svg className="retirada__icone" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
)

// Local de retirada (localização da empresa): nome, CEP e o link com ícone para abrir no Google Maps
function LocaisRetirada() {
  const [locais, setLocais] = useState(null)
  useEffect(() => {
    let ativo = true
    buscarLocais().then((l) => ativo && setLocais(l))
    return () => {
      ativo = false
    }
  }, [])

  if (!locais) return <p className="retirada__nota">Carregando o local de retirada…</p>
  if (!locais.length) return <p className="retirada__nota">Combinamos o local de retirada com você pelo WhatsApp.</p>

  const unico = locais.length === 1
  return (
    <ul className="retirada" aria-label={unico ? 'Local de retirada' : 'Locais de retirada'}>
      {locais.map((local, i) => {
        const endereco = enderecoCompleto(local)
        const link = linkMapa(local)
        return (
          <li key={i} className="retirada__local">
            <strong>{local.nome}</strong>
            {endereco && <span>{endereco}</span>}
            {link && (
              <a className="retirada__link" href={link} target="_blank" rel="noopener noreferrer" aria-label={`Ver a localização de ${local.nome} no Google Maps (abre em nova aba)`}>
                <IconeMapa />
                Ver localização no Google Maps
              </a>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// Escolha da forma de envio antes de mandar o pedido pelo WhatsApp (padrão: Combinar Frete).
// Ao escolher "Retirar c/ vendedor", aparece a localização do vendedor no Google Maps.
//   comTransportadora: mostra "Receber em casa" (pedido com produtos que calculam frete pelo Melhor Envio)
export default function FormaEnvio({ valor, aoMudar, idBase = 'envio', comTransportadora = false }) {
  return (
    <fieldset className="forma-envio">
      <legend>Forma de envio</legend>
      {FRETES.filter((f) => !f.calculado || comTransportadora).map((f) => (
        <label key={f.id} className={`forma-envio__opcao ${valor === f.id ? 'is-ativa' : ''}`} htmlFor={`${idBase}-${f.id}`}>
          <input type="radio" id={`${idBase}-${f.id}`} name={`${idBase}-frete`} value={f.id} checked={valor === f.id} onChange={() => aoMudar(f.id)} />
          <span>
            <strong>{f.descricao}</strong>
            <small>{f.detalhe}</small>
          </span>
        </label>
      ))}
      {valor === RETIRAR && (
        <div className="forma-envio__retirada" aria-live="polite">
          <LocaisRetirada />
        </div>
      )}
    </fieldset>
  )
}
