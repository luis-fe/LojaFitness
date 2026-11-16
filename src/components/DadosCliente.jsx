'use client'

import { useEffect, useRef, useState } from 'react'
import './DadosCliente.css'
import { buscarCep, formatarCep, soDigitosCep, validarCliente } from '@/lib/cliente'

const CHAVE = 'jlk-cliente' // lembra os dados neste aparelho para a próxima compra

// Estado do formulário + se já pode enviar
export function useDadosCliente() {
  const [cliente, setCliente] = useState({ nome: '', cep: '', bairro: '', cidade: '', estado: '' })
  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null')
      if (salvo && typeof salvo === 'object') setCliente((c) => ({ ...c, ...salvo }))
    } catch {
      /* sem armazenamento */
    }
  }, [])
  const lembrar = (dados) => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(dados))
    } catch {
      /* sem armazenamento */
    }
  }
  const { dados, erros } = validarCliente(cliente)
  return { cliente, setCliente, dados, completo: Object.keys(erros).length === 0, lembrar }
}

// Nome, CEP (preenche bairro, cidade e estado sozinho), bairro, cidade e estado
export default function DadosCliente({ cliente, setCliente, idBase = 'cliente' }) {
  const [buscando, setBuscando] = useState(false)
  const [avisoCep, setAvisoCep] = useState('')
  const ultimoCep = useRef('')

  const mudar = (campo) => (e) => setCliente((c) => ({ ...c, [campo]: e.target.value }))

  // Com 8 números, busca o endereço do CEP
  useEffect(() => {
    const cep = soDigitosCep(cliente.cep)
    if (cep.length !== 8) {
      setAvisoCep('')
      return
    }
    if (cep === ultimoCep.current) return
    ultimoCep.current = cep
    let cancelado = false
    setBuscando(true)
    setAvisoCep('')
    buscarCep(cep)
      .then((end) => {
        if (cancelado) return
        if (!end) {
          setAvisoCep('CEP não encontrado. Confira os números.')
          setCliente((c) => ({ ...c, bairro: '', cidade: '', estado: '' }))
          return
        }
        setCliente((c) => ({ ...c, bairro: end.bairro || c.bairro, cidade: end.cidade, estado: end.estado }))
        if (!end.bairro) setAvisoCep('Este CEP não tem bairro definido: digite o seu bairro.')
      })
      .catch(() => !cancelado && setAvisoCep('Não foi possível consultar o CEP agora. Preencha bairro, cidade e estado.'))
      .finally(() => !cancelado && setBuscando(false))
    return () => {
      cancelado = true
    }
  }, [cliente.cep, setCliente])

  const cepCompleto = soDigitosCep(cliente.cep).length === 8
  const falhouConsulta = avisoCep.startsWith('Não foi possível')

  return (
    <fieldset className="dados-cliente">
      <legend>Dados para entrega</legend>
      <div className="dados-cliente__grade">
        <div className="campo dados-cliente__largo">
          <label htmlFor={`${idBase}-nome`}>Nome</label>
          <input id={`${idBase}-nome`} value={cliente.nome} onChange={mudar('nome')} autoComplete="name" maxLength={120} placeholder="Seu nome completo" />
        </div>
        <div className="campo">
          <label htmlFor={`${idBase}-cep`}>CEP</label>
          <input
            id={`${idBase}-cep`}
            value={formatarCep(cliente.cep)}
            onChange={(e) => setCliente((c) => ({ ...c, cep: soDigitosCep(e.target.value) }))}
            autoComplete="postal-code"
            inputMode="numeric"
            placeholder="00000-000"
            aria-describedby={`${idBase}-cep-aviso`}
          />
          <span id={`${idBase}-cep-aviso`} className={`campo__dica ${avisoCep ? 'dados-cliente__aviso' : ''}`} aria-live="polite">
            {buscando ? 'Buscando endereço…' : avisoCep || 'Bairro, cidade e estado são preenchidos pelo CEP.'}
          </span>
        </div>
        <div className="campo">
          <label htmlFor={`${idBase}-bairro`}>Bairro</label>
          <input id={`${idBase}-bairro`} value={cliente.bairro} onChange={mudar('bairro')} maxLength={80} disabled={!cepCompleto} />
        </div>
        <div className="campo">
          <label htmlFor={`${idBase}-cidade`}>Cidade</label>
          <input id={`${idBase}-cidade`} value={cliente.cidade} onChange={mudar('cidade')} maxLength={80} readOnly={!falhouConsulta} disabled={!cepCompleto} />
        </div>
        <div className="campo">
          <label htmlFor={`${idBase}-estado`}>Estado</label>
          <input
            id={`${idBase}-estado`}
            value={cliente.estado}
            onChange={(e) => setCliente((c) => ({ ...c, estado: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) }))}
            maxLength={2}
            readOnly={!falhouConsulta}
            disabled={!cepCompleto}
          />
        </div>
      </div>
    </fieldset>
  )
}
