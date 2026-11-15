'use client'

import { useMemo, useState } from 'react'
import './ListaDados.css'

// ============================================================================
// PADRÃO DE LISTAS DO PROJETO
//
//   • Computador: tabela; clicar no cabeçalho ordena A→Z, clicar de novo Z→A.
//   • Celular: cada linha vira um card, com o seletor "Ordenar por" no topo.
//
// Uso:
//   <ListaDados
//     rotulo="Cores"                         // nome da lista (acessibilidade)
//     itens={cores}
//     chave={(c) => c.codigo}                // identificador único da linha
//     colunas={[
//       { id: 'nome', titulo: 'Nome', valor: (c) => c.nome, destaque: true },
//       { id: 'rgb',  titulo: 'RGB',  valor: (c) => c.rgb, exibir: (c) => <Amostra cor={c.rgb} /> },
//       { id: 'uso',  titulo: 'Em uso', valor: (c) => c.em_uso, alinhar: 'direita' },
//       { id: 'x',    titulo: 'Interno', valor: ..., ordenavel: false, noCelular: false },
//     ]}
//     ordemInicial={{ coluna: 'nome', direcao: 'asc' }}
//     acoes={(c) => <button>Editar</button>}  // opcional: botões de cada linha
//     vazio="Nenhuma cor cadastrada."
//   />
//
// Opções de coluna:
//   valor(item)    → valor usado para ORDENAR (texto, número ou data)
//   exibir(item)   → o que aparece na tela (padrão: o próprio valor)
//   destaque       → no celular vira o título do card
//   ordenavel      → false para não ordenar por esta coluna
//   noCelular      → false para esconder a coluna nos cards
//   alinhar        → 'direita' para números
//   letraALetra    → true para códigos (ex.: #4A7FD8, SKU): compara caractere a caractere,
//                    sem tratar os dígitos como número
// ============================================================================

const comparador = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })
const comparadorLetraALetra = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: false })

function comparar(a, b, letraALetra = false) {
  const vazioA = a === null || a === undefined || a === ''
  const vazioB = b === null || b === undefined || b === ''
  if (vazioA || vazioB) return vazioA === vazioB ? 0 : vazioA ? 1 : -1 // vazios sempre no fim
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (a instanceof Date && b instanceof Date) return a - b
  return (letraALetra ? comparadorLetraALetra : comparador).compare(String(a), String(b))
}

function Seta({ direcao }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`lista__seta lista__seta--${direcao ?? 'nenhuma'}`}>
      {direcao === 'desc' ? <path d="M12 5v14M6 13l6 6 6-6" /> : direcao === 'asc' ? <path d="M12 19V5M6 11l6-6 6 6" /> : <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />}
    </svg>
  )
}

export default function ListaDados({ rotulo, itens, colunas, chave, acoes, ordemInicial, vazio = 'Nada para mostrar.', aoClicarLinha }) {
  const [ordem, setOrdem] = useState(ordemInicial ?? { coluna: null, direcao: 'asc' })

  const ordenados = useMemo(() => {
    const col = colunas.find((c) => c.id === ordem.coluna)
    if (!col) return itens
    const fator = ordem.direcao === 'desc' ? -1 : 1
    // Ordenação estável: empates mantêm a ordem original
    return itens
      .map((item, i) => ({ item, i }))
      .sort((x, y) => fator * comparar(col.valor(x.item), col.valor(y.item), col.letraALetra) || x.i - y.i)
      .map(({ item }) => item)
  }, [itens, colunas, ordem])

  const ordenar = (id) =>
    setOrdem((atual) => ({ coluna: id, direcao: atual.coluna === id && atual.direcao === 'asc' ? 'desc' : 'asc' }))

  const ordenaveis = colunas.filter((c) => c.ordenavel !== false)
  const destaque = colunas.find((c) => c.destaque) ?? colunas[0]
  const exibir = (col, item) => (col.exibir ? col.exibir(item) : col.valor(item) ?? '—')
  const colAtual = colunas.find((c) => c.id === ordem.coluna)

  if (!itens.length) return <div className="lista__vazia">{vazio}</div>

  return (
    <div className="lista">
      {/* Celular: seletor de ordenação */}
      {ordenaveis.length > 0 && (
        <div className="lista__ordenar-celular">
          <label htmlFor={`ordenar-${rotulo}`}>Ordenar por</label>
          <div className="lista__ordenar-controles">
            <select id={`ordenar-${rotulo}`} value={ordem.coluna ?? ''} onChange={(e) => setOrdem({ coluna: e.target.value || null, direcao: 'asc' })}>
              {!ordem.coluna && <option value="">Padrão</option>}
              {ordenaveis.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titulo}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setOrdem((o) => ({ ...o, direcao: o.direcao === 'asc' ? 'desc' : 'asc' }))}
              aria-label={ordem.direcao === 'asc' ? 'Ordem crescente (A a Z). Tocar para inverter' : 'Ordem decrescente (Z a A). Tocar para inverter'}
              disabled={!ordem.coluna}
            >
              {ordem.direcao === 'asc' ? 'A→Z' : 'Z→A'}
            </button>
          </div>
        </div>
      )}

      <table className="lista__tabela" aria-label={rotulo}>
        <caption className="lista__legenda">
          {rotulo}
          {colAtual ? `, ordenado por ${colAtual.titulo} ${ordem.direcao === 'asc' ? 'crescente' : 'decrescente'}` : ''}
        </caption>
        <thead>
          <tr>
            {colunas.map((col) => {
              const ativa = ordem.coluna === col.id
              return (
                <th
                  key={col.id}
                  scope="col"
                  className={col.alinhar === 'direita' ? 'is-direita' : ''}
                  aria-sort={ativa ? (ordem.direcao === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {col.ordenavel === false ? (
                    col.titulo
                  ) : (
                    <button type="button" className={`lista__cabecalho ${ativa ? 'is-ativa' : ''}`} onClick={() => ordenar(col.id)}>
                      {col.titulo}
                      <Seta direcao={ativa ? ordem.direcao : null} />
                    </button>
                  )}
                </th>
              )
            })}
            {acoes && (
              <th scope="col" className="is-direita">
                <span className="lista__legenda">Ações</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {ordenados.map((item) => (
            <tr key={chave(item)} className={aoClicarLinha ? 'is-clicavel' : ''} onClick={aoClicarLinha ? () => aoClicarLinha(item) : undefined}>
              {colunas.map((col) => (
                <td
                  key={col.id}
                  data-titulo={col.titulo}
                  className={[col === destaque ? 'is-destaque' : '', col.alinhar === 'direita' ? 'is-direita' : '', col.noCelular === false ? 'is-so-computador' : ''].join(' ')}
                >
                  {exibir(col, item)}
                </td>
              ))}
              {acoes && (
                <td className="lista__acoes" onClick={(e) => e.stopPropagation()}>
                  {acoes(item)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
