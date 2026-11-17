'use client'

import { useEffect, useState } from 'react'
import './EntregaTransportadora.css'
import { ENTREGA_VAZIA, mascaraCpf, validarEntrega } from '@/lib/entrega'
import { mascaraTelefone } from '@/lib/formatos'

const CHAVE = 'jlk-entrega' // lembra rua, número, celular e e-mail neste aparelho (o CPF não fica salvo)

// Estado de "Receber em casa": serviço escolhido na cotação + dados de entrega do cliente
export function useEntregaTransportadora() {
  const [servico, setServico] = useState(null) // { id, nome, empresa, preco, prazo }
  const [entrega, setEntrega] = useState(ENTREGA_VAZIA)
  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null')
      if (salvo && typeof salvo === 'object') setEntrega((e) => ({ ...e, ...salvo, cpf: '' }))
    } catch {
      /* sem armazenamento */
    }
  }, [])
  const lembrar = () => {
    try {
      const { cpf, ...semCpf } = entrega
      localStorage.setItem(CHAVE, JSON.stringify(semCpf))
    } catch {
      /* sem armazenamento */
    }
  }
  const { dados, erros } = validarEntrega(entrega)
  return { servico, setServico, entrega, setEntrega, dados, erros, completa: Object.keys(erros).length === 0, lembrar }
}

// Campos pedidos para gerar a etiqueta: rua (vem do CEP), número, complemento, CPF, celular e e-mail
//   logradouroCep: rua devolvida pela busca do CEP (preenche a rua quando o CEP muda)
export default function EntregaTransportadora({ entrega, setEntrega, erros, logradouroCep, idBase = 'entrega' }) {
  const [tocados, setTocados] = useState({})
  useEffect(() => {
    if (logradouroCep) setEntrega((e) => ({ ...e, logradouro: logradouroCep }))
  }, [logradouroCep, setEntrega])

  const campo = (nome, rotulo, props = {}) => {
    const erro = tocados[nome] && erros[nome]
    const { mascara, opcional, largo, ...resto } = props
    return (
      <div className={`campo ${largo ? 'entrega__largo' : ''}`}>
        <label htmlFor={`${idBase}-${nome}`}>
          {rotulo}
          {opcional && <span className="entrega__opcional"> (opcional)</span>}
        </label>
        <input
          id={`${idBase}-${nome}`}
          value={entrega[nome]}
          onChange={(e) => setEntrega((x) => ({ ...x, [nome]: mascara ? mascara(e.target.value) : e.target.value }))}
          onBlur={() => setTocados((t) => ({ ...t, [nome]: true }))}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? `${idBase}-${nome}-erro` : undefined}
          {...resto}
        />
        {erro && (
          <span id={`${idBase}-${nome}-erro`} className="entrega__erro">
            {erro}
          </span>
        )}
      </div>
    )
  }

  return (
    <fieldset className="entrega">
      <legend>Endereço para a etiqueta</legend>
      <div className="entrega__grade">
        {campo('logradouro', 'Rua / avenida', { largo: true, autoComplete: 'address-line1', maxLength: 120 })}
        {campo('numero', 'Número', { maxLength: 20, placeholder: '123 ou S/N' })}
        {campo('complemento', 'Complemento', { opcional: true, maxLength: 60, placeholder: 'Apto, bloco…', autoComplete: 'address-line2' })}
        {campo('cpf', 'CPF', { mascara: mascaraCpf, inputMode: 'numeric', placeholder: '000.000.000-00' })}
        {campo('telefone', 'Celular', { mascara: mascaraTelefone, inputMode: 'tel', placeholder: '(62) 98765-4321', autoComplete: 'tel' })}
        {campo('email', 'E-mail', { opcional: true, largo: true, type: 'email', autoComplete: 'email', placeholder: 'para receber o rastreio' })}
      </div>
      <p className="entrega__nota">O CPF é exigido pelos Correios e transportadoras na declaração de conteúdo do pacote.</p>
    </fieldset>
  )
}
