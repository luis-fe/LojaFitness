'use client'

import { useMemo, useState } from 'react'
import './SeletorProdutos.css'
import Preco from '@/components/Preco'
import { resumoVariacoes } from '@/components/blocos/AnuncioProduto'

// Escolha de produtos do cadastro (só os que estão à venda) para as camadas do Meu Site.
//   produtos: catálogo · limite: quantos ainda cabem · multiplo · aoEscolher([slug, ...])
export default function SeletorProdutos({ produtos, limite = 1, multiplo = false, jaUsados = [], aoEscolher, aoCancelar }) {
  const [busca, setBusca] = useState('')
  const [marcados, setMarcados] = useState([])

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return (produtos ?? []).filter((p) => !t || `${p.nome} ${p.codigo}`.toLowerCase().includes(t))
  }, [produtos, busca])

  const clicar = (slug) => {
    if (!multiplo) return aoEscolher([slug])
    setMarcados((m) => (m.includes(slug) ? m.filter((s) => s !== slug) : m.length >= limite ? m : [...m, slug]))
  }

  if (!produtos) return <div className="seletor-produtos__vazio" aria-busy="true">Carregando produtos…</div>

  return (
    <div className="seletor-produtos">
      <div className="campo seletor-produtos__busca">
        <label htmlFor="busca-produtos-layout" className="sr-only">
          Buscar produto
        </label>
        <input id="busca-produtos-layout" type="search" placeholder="Buscar produto por nome ou código" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      <p className="seletor-produtos__dica">Só aparecem produtos visíveis na loja. O anúncio (foto, preço, cores e tamanhos) vem do cadastro.</p>

      {lista.length === 0 ? (
        <div className="seletor-produtos__vazio">Nenhum produto encontrado. Cadastre ou deixe visível em Produtos.</div>
      ) : (
        <ul className="seletor-produtos__grade">
          {lista.map((p) => {
            const ordem = marcados.indexOf(p.slug)
            const { tamanhos, esgotado } = resumoVariacoes(p)
            return (
              <li key={p.slug}>
                <button type="button" className={`seletor-produtos__item ${ordem >= 0 ? 'is-marcado' : ''}`} onClick={() => clicar(p.slug)} aria-pressed={multiplo ? ordem >= 0 : undefined}>
                  <img src={p.imagem} alt="" loading="lazy" />
                  <span className="seletor-produtos__nome">{p.nome}</span>
                  <span className="seletor-produtos__preco">
                    <Preco produto={p} />
                  </span>
                  <span className="seletor-produtos__tam">{esgotado ? 'Esgotado' : tamanhos.join(' · ')}</span>
                  {jaUsados.includes(p.slug) && <span className="seletor-produtos__usado">já nesta camada</span>}
                  {ordem >= 0 && <span className="seletor-produtos__ordem">{ordem + 1}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {multiplo && (
        <div className="acoes-form">
          <span className="seletor-produtos__contagem">
            {marcados.length} de até {limite} selecionado{marcados.length === 1 ? '' : 's'}
          </span>
          <button type="button" className="botao botao--secundario" onClick={aoCancelar}>
            Cancelar
          </button>
          <button type="button" className="botao" disabled={!marcados.length} onClick={() => aoEscolher(marcados)}>
            Adicionar
          </button>
        </div>
      )}
    </div>
  )
}
