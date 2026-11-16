'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import '@/components/Formulario.css'
import './Cadastros.css'
import './Entradas.css'
import PaginaVendedor from '@/components/PaginaVendedor'
import MovimentosEstoque from '@/components/MovimentosEstoque'
import { useAutenticacao } from '@/context/Autenticacao'
import { useErro } from '@/context/Erro'
import { AmostraCor } from '@/views/Cores'

const TRILHA = [{ href: '/area-do-vendedor/produtos', rotulo: 'Produtos' }]
const chave = (v) => `${v.cor}|${v.tamanho}`
const comSinal = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0')

// Produtos → Inventário: conta as peças e ajusta o estoque para a contagem.
// A diferença (positiva ou negativa) fica registrada em mov_produto como 'inventario'.
export default function Inventario() {
  const { api } = useAutenticacao()
  const { mostrarErro } = useErro()
  const [produtos, setProdutos] = useState(null)
  const [codigo, setCodigo] = useState('')
  const [contagens, setContagens] = useState({}) // { "COR|TAM": "7" }
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
    const id = setTimeout(() => setAviso(''), 7000)
    return () => clearTimeout(id)
  }, [aviso])

  const produto = useMemo(() => produtos?.find((p) => p.codigo === codigo) ?? null, [produtos, codigo])
  const valor = (v) => contagens[chave(v)] ?? ''
  const invalida = (t) => t !== '' && !(Number.isInteger(Number(t)) && Number(t) >= 0 && Number(t) <= 99999)
  const contadas = produto ? produto.variacoes.filter((v) => valor(v) !== '') : []
  const diferencaDe = (v) => Number(valor(v)) - v.estoque
  const comAjuste = contadas.filter((v) => !invalida(valor(v)) && diferencaDe(v) !== 0)
  const saldo = comAjuste.reduce((s, v) => s + diferencaDe(v), 0)
  const podeEfetivar = contadas.length > 0 && !contadas.some((v) => invalida(valor(v))) && !salvando

  // atalho: copiar o estoque do sistema para a contagem (o vendedor só corrige o que diferir)
  const preencherComSistema = () => setContagens(Object.fromEntries(produto.variacoes.map((v) => [chave(v), String(v.estoque)])))

  const efetivar = async () => {
    setSalvando(true)
    const { ok, dados } = await api('/api/estoque/inventario', {
      metodo: 'POST',
      corpo: { codigo, contagens: contadas.map((v) => ({ cor: v.cor, tamanho: v.tamanho, contado: Number(valor(v)) })) },
    })
    setSalvando(false)
    if (!ok) return mostrarErro(dados?.erros || dados?.erro || 'Não foi possível registrar o inventário.')
    setAviso(
      dados.ajustadas
        ? `Inventário registrado: ${dados.contadas} variações contadas, ${dados.ajustadas} ajustada${dados.ajustadas === 1 ? '' : 's'} (saldo ${comSinal(dados.diferenca)} peças).`
        : `Inventário conferido: ${dados.contadas} variações contadas, nenhuma diferença.`
    )
    setContagens({})
    await carregarProdutos()
    carregarMovimentos(codigo)
  }

  return (
    <PaginaVendedor titulo="Inventário" trilha={TRILHA} largura={960}>
      <div aria-live="polite">{aviso && <p className="aviso aviso--sucesso cadastro__aviso">{aviso}</p>}</div>

      <div className="campo entradas__produto">
        <label htmlFor="inventario-produto">Produto</label>
        <select
          id="inventario-produto"
          value={codigo}
          disabled={!produtos}
          onChange={(e) => {
            setCodigo(e.target.value)
            setContagens({})
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
            <p className="lista__vazia">Este produto não tem variações para inventariar.</p>
          ) : (
            <>
              <p className="campo__dica inventario__dica">
                Digite quantas peças você contou. Variação em branco não é alterada.{' '}
                <button type="button" className="link-acao" onClick={preencherComSistema}>
                  Preencher com o estoque do sistema
                </button>
              </p>
              <table className="entradas__tabela">
                <caption className="sr-only">Inventário de {produto.nome}: estoque do sistema e contagem</caption>
                <thead>
                  <tr>
                    <th scope="col">Cor</th>
                    <th scope="col">Tam.</th>
                    <th scope="col" className="entradas__num">
                      No sistema
                    </th>
                    <th scope="col" className="entradas__num">
                      Contagem
                    </th>
                    <th scope="col" className="entradas__num">
                      Diferença
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {produto.variacoes.map((v) => {
                    const t = valor(v)
                    const erro = invalida(t)
                    const dif = t === '' || erro ? null : diferencaDe(v)
                    return (
                      <tr key={chave(v)} className={dif ? 'is-preenchida' : ''}>
                        <td data-rotulo="Cor">
                          <span className="entradas__cor">
                            <AmostraCor rgb={v.rgb} tamanho={14} /> {v.corNome}
                          </span>
                        </td>
                        <td data-rotulo="Tam.">{v.tamanho}</td>
                        <td data-rotulo="No sistema" className="entradas__num">
                          {v.estoque}
                        </td>
                        <td data-rotulo="Contagem" className="entradas__num">
                          <input
                            type="number"
                            min={0}
                            max={99999}
                            inputMode="numeric"
                            value={t}
                            placeholder="—"
                            onChange={(e) => setContagens((c) => ({ ...c, [chave(v)]: e.target.value }))}
                            aria-label={`Contagem de ${v.corNome} ${v.tamanho}`}
                            aria-invalid={erro || undefined}
                          />
                        </td>
                        <td data-rotulo="Diferença" className={`entradas__num inventario__dif ${dif > 0 ? 'is-positivo' : dif < 0 ? 'is-negativo' : ''}`}>
                          {dif === null ? '—' : comSinal(dif)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </>
          )}

          <div className="entradas__rodape">
            <span>
              {contadas.length
                ? `${contadas.length} contada${contadas.length === 1 ? '' : 's'} · ${comAjuste.length} com diferença · saldo ${comSinal(saldo)} peças`
                : 'Informe a contagem das variações'}
            </span>
            <div className="acoes-form">
              <button type="button" className="botao botao--secundario" onClick={() => setContagens({})} disabled={!contadas.length || salvando}>
                Limpar
              </button>
              <button type="button" className="botao botao--dourado" onClick={efetivar} disabled={!podeEfetivar}>
                {salvando ? 'Registrando…' : 'Efetivar inventário'}
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
