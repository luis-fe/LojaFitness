'use client'

import { useEffect, useRef, useState } from 'react'
import './DadosCliente.css'
import { buscarCep, formatarCep, soDigitosCep, validarCliente } from '@/lib/cliente'
import { ResultadoFrete, useSimularFrete } from '@/components/SimularFrete'

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
//   legenda: título do quadro · extras: campos depois do nome (ex.: CNPJ no lançamento manual)
//   itensFrete: [{ slug, quantidade }] dos produtos com "calcula frete" — mostra o botão "Calcular frete"
//               ao lado do CEP e as opções do Melhor Envio abaixo dos dados
//   aoEscolherServico (Receber em casa): as opções do frete viram uma escolha; servicoEscolhido = id escolhido
export default function DadosCliente({
  cliente,
  setCliente,
  idBase = 'cliente',
  legenda = 'Dados para entrega',
  extras = null,
  itensFrete = [],
  servicoEscolhido = null,
  aoEscolherServico = null,
}) {
  const comFrete = itensFrete.length > 0
  const frete = useSimularFrete(itensFrete, cliente.cep)
  // CEP ou produtos mudaram (opções zeradas): a escolha anterior não vale mais
  useEffect(() => {
    if (!frete.opcoes) aoEscolherServico?.(null)
  }, [frete.opcoes, aoEscolherServico])
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
        setCliente((c) => ({ ...c, bairro: end.bairro || c.bairro, cidade: end.cidade, estado: end.estado, logradouro: end.logradouro || '' }))
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
      <legend>{legenda}</legend>
      <div className="dados-cliente__grade">
        <div className="campo dados-cliente__largo">
          <label htmlFor={`${idBase}-nome`}>Nome</label>
          <input id={`${idBase}-nome`} value={cliente.nome} onChange={mudar('nome')} autoComplete="name" maxLength={120} placeholder="Nome completo" />
        </div>
        {extras}
        <div className={`campo ${comFrete ? 'dados-cliente__largo' : ''}`}>
          <label htmlFor={`${idBase}-cep`}>CEP</label>
          <div className={comFrete ? 'dados-cliente__cep' : undefined}>
            <input
              id={`${idBase}-cep`}
              value={formatarCep(cliente.cep)}
              onChange={(e) => setCliente((c) => ({ ...c, cep: soDigitosCep(e.target.value) }))}
              onKeyDown={(e) => comFrete && e.key === 'Enter' && (e.preventDefault(), frete.simular())}
              autoComplete="postal-code"
              inputMode="numeric"
              placeholder="00000-000"
              aria-describedby={`${idBase}-cep-aviso${comFrete ? ` ${idBase}-frete` : ''}`}
            />
            {comFrete && (
              <button type="button" className="dados-cliente__frete" onClick={frete.simular} disabled={!frete.pronto || frete.carregando}>
                {frete.carregando ? 'Calculando…' : 'Calcular frete'}
              </button>
            )}
          </div>
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
      {comFrete && <ResultadoFrete id={`${idBase}-frete`} {...frete} escolhido={servicoEscolhido} aoEscolher={aoEscolherServico} />}
    </fieldset>
  )
}
