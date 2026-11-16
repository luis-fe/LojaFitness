'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import '@/components/Formulario.css'
import './Cadastros.css'
import './Entradas.css'
import PaginaVendedor from '@/components/PaginaVendedor'
import { useAutenticacao } from '@/context/Autenticacao'
import { useErro } from '@/context/Erro'
import { AmostraCor } from '@/views/Cores'
import MovimentosEstoque from '@/components/MovimentosEstoque'

const TRILHA = [{ href: '/area-do-vendedor/produtos', rotulo: 'Produtos' }]
const chave = (v) => `${v.cor}|${v.tamanho}`

// Produtos → Entradas: escolhe o produto, vê as variações com o estoque atual e informa a entrada
export default function Entradas() {
  const { api } = useAutenticacao()
  const { mostrarErro } = useErro()
  const [produtos, setProdutos] = useState(null)
  const [codigo, setCodigo] = useState('')
  const [entradas, setEntradas] = useState({}) // { "COR|TAM": "5" }
  const [movimentos, setMovimentos] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState('')

  const carregarProdutos = useCallback(async () => {
    const { ok, dados } = await api('/api/estoque/produtos')
    if (ok) setProdutos(dados.produtos)
    else {
      setProdutos([])
      mostrarErro(dados?.erro || 'Não foi possível carregar os produtos.')
    }
  }, [api, mostrarErro])

  const carregarMovimentos = useCallback(
    async (cod) => {
      if (!cod) return setMovimentos(null)
      const { ok, dados } = await api(`/api/estoque/movimentos?codigo=${encodeURIComponent(cod)}`)
      setMovimentos(ok ? dados.movimentos : [])
    },
    [api]
  )

  useEffect(() => {
    carregarProdutos()
  }, [carregarProdutos])

  useEffect(() => {
    carregarMovimentos(codigo)
  }, [codigo, carregarMovimentos])

  useEffect(() => {
    if (!aviso) return
    const id = setTimeout(() => setAviso(''), 6000)
    return () => clearTimeout(id)
  }, [aviso])

  const produto = useMemo(() => produtos?.find((p) => p.codigo === codigo) ?? null, [produtos, codigo])
  const valor = (v) => entradas[chave(v)] ?? ''
  const invalida = (t) => t !== '' && !(Number.isInteger(Number(t)) && Number(t) >= 1 && Number(t) <= 99999)
  const preenchidas = produto ? produto.variacoes.filter((v) => valor(v) !== '') : []
  const totalEntrada = preenchidas.reduce((s, v) => s + (invalida(valor(v)) ? 0 : Number(valor(v))), 0)
  const podeEfetivar = preenchidas.length > 0 && !preenchidas.some((v) => invalida(valor(v))) && !salvando

  const efetivar = async () => {
    setSalvando(true)
    const { ok, dados } = await api('/api/estoque/entradas', {
      metodo: 'POST',
      corpo: { codigo, itens: preenchidas.map((v) => ({ cor: v.cor, tamanho: v.tamanho, qtd: Number(valor(v)) })) },
    })
    setSalvando(false)
    if (!ok) return mostrarErro(dados?.erros || dados?.erro || 'Não foi possível registrar a entrada.')
    setAviso(`Entrada registrada: ${dados.pecas} peça${dados.pecas === 1 ? '' : 's'} em ${dados.variacoes} ${dados.variacoes === 1 ? 'variação' : 'variações'} de ${produto.nome}.`)
    setEntradas({})
    await carregarProdutos()
    carregarMovimentos(codigo)
  }

  return (
    <PaginaVendedor titulo="Entradas" trilha={TRILHA} largura={960}>
      <div aria-live="polite">{aviso && <p className="aviso aviso--sucesso cadastro__aviso">{aviso}</p>}</div>

      <div className="campo entradas__produto">
        <label htmlFor="entrada-produto">Produto</label>
        <select
          id="entrada-produto"
          value={codigo}
          disabled={!produtos}
          onChange={(e) => {
            setCodigo(e.target.value)
            setEntradas({})
          }}
        >
          <option value="">{produtos ? 'Escolha o produto…' : 'Carregando…'}</option>
          {(produtos ?? []).map((p) => (
            <option key={p.codigo} value={p.codigo}>
              {p.nome} ({p.codigo}){p.ativo ? '' : ' — oculto na loja'}
            </option>
          ))}
        </select>
      </div>

      {produto && (
        <>
          {produto.variacoes.length === 0 ? (
            <p className="lista__vazia">Este produto não tem variações. Cadastre as variações em Produtos para dar entrada.</p>
          ) : (
            <table className="entradas__tabela">
              <caption className="sr-only">Variações de {produto.nome} com estoque atual e entrada</caption>
              <thead>
                <tr>
                  <th scope="col">Cor</th>
                  <th scope="col">Tam.</th>
                  <th scope="col" className="entradas__num">
                    Estoque atual
                  </th>
                  <th scope="col" className="entradas__num">
                    Entrada
                  </th>
                  <th scope="col" className="entradas__num">
                    Novo estoque
                  </th>
                </tr>
              </thead>
              <tbody>
                {produto.variacoes.map((v) => {
                  const t = valor(v)
                  const erro = invalida(t)
                  return (
                    <tr key={chave(v)} className={t && !erro ? 'is-preenchida' : ''}>
                      <td data-rotulo="Cor">
                        <span className="entradas__cor">
                          <AmostraCor rgb={v.rgb} tamanho={14} /> {v.corNome}
                        </span>
                      </td>
                      <td data-rotulo="Tam.">{v.tamanho}</td>
                      <td data-rotulo="Estoque atual" className="entradas__num">
                        {v.estoque}
                      </td>
                      <td data-rotulo="Entrada" className="entradas__num">
                        <input
                          type="number"
                          min={1}
                          max={99999}
                          inputMode="numeric"
                          value={t}
                          placeholder="0"
                          onChange={(e) => setEntradas((en) => ({ ...en, [chave(v)]: e.target.value }))}
                          aria-label={`Entrada de ${v.corNome} ${v.tamanho}`}
                          aria-invalid={erro || undefined}
                        />
                      </td>
                      <td data-rotulo="Novo estoque" className="entradas__num entradas__novo">
                        {t && !erro ? v.estoque + Number(t) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          <div className="entradas__rodape">
            <span>
              {preenchidas.length ? `${totalEntrada} peça${totalEntrada === 1 ? '' : 's'} em ${preenchidas.length} ${preenchidas.length === 1 ? 'variação' : 'variações'}` : 'Informe a entrada nas variações'}
            </span>
            <div className="acoes-form">
              <button type="button" className="botao botao--secundario" onClick={() => setEntradas({})} disabled={!preenchidas.length || salvando}>
                Limpar
              </button>
              <button type="button" className="botao botao--dourado" onClick={efetivar} disabled={!podeEfetivar}>
                {salvando ? 'Registrando…' : 'Efetivar entrada'}
              </button>
            </div>
          </div>

          <section className="entradas__historico" aria-labelledby="mov-titulo">
            <h2 id="mov-titulo">Últimas movimentações</h2>
            <MovimentosEstoque movimentos={movimentos} />
          </section>
        </>
      )}
    </PaginaVendedor>
  )
}
