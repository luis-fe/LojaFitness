'use client'

import './FormaEnvio.css'
import { FRETES } from '@/lib/frete'

// Escolha da forma de envio antes de mandar o pedido pelo WhatsApp (padrão: Combinar Frete)
export default function FormaEnvio({ valor, aoMudar, idBase = 'envio' }) {
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
    </fieldset>
  )
}
