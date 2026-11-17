'use client'

import { useEffect, useState } from 'react'
import './FormaEnvio.css'
import { FRETES } from '@/lib/frete'
import SimularFrete from '@/components/SimularFrete'
import { enderecoCompleto, linkMapa, urlMapaEmbutido } from '@/lib/retirada'

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

// Local de retirada: endereço do vendedor, mapa e link para abrir no Google Maps
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
        const mapa = unico ? urlMapaEmbutido(local) : null // vários locais: só os links, para não carregar vários mapas
        return (
          <li key={i} className="retirada__local">
            <strong>{local.nome}</strong>
            {endereco && <span>{endereco}</span>}
            {mapa && <iframe className="retirada__mapa" src={mapa} title={`Mapa do local de retirada: ${local.nome}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />}
            {link && (
              <a className="retirada__link" href={link} target="_blank" rel="noopener noreferrer">
                Abrir no Google Maps
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
// itensFrete: [{ slug, quantidade }] dos produtos com "calcula frete" — mostra o "Simular frete" pelo CEP.
export default function FormaEnvio({ valor, aoMudar, idBase = 'envio', itensFrete = [] }) {
  return (
    <fieldset className="forma-envio">
      <legend>Forma de envio</legend>
      {FRETES.map((f) => (
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
      {valor !== RETIRAR && itensFrete.length > 0 && <SimularFrete itens={itensFrete} idBase={`${idBase}-simular`} />}
    </fieldset>
  )
}
