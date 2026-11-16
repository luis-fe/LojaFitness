'use client'

import { formatarDataHora } from '@/lib/formatos'

const ROTULO = { entrada: 'Entrada', saida: 'Saída', inventario: 'Inventário' }

// Últimas movimentações do produto (mov_produto): entrada (+), saída (−) e inventário (+ ou −)
export default function MovimentosEstoque({ movimentos }) {
  if (!movimentos) return <div className="cadastro__carregando" aria-busy="true" />
  if (!movimentos.length) return <p className="lista__vazia">Nenhuma movimentação ainda.</p>
  return (
    <ul className="entradas__movs">
      {movimentos.map((m) => {
        const sinal = m.movimento === 'saida' ? -m.qtd : m.qtd // saída é gravada positiva; inventário já vem com sinal
        return (
          <li key={m.id}>
            <span className={`entradas__tipo entradas__tipo--${m.movimento}`}>{ROTULO[m.movimento] ?? m.movimento}</span>
            <strong className={sinal < 0 ? 'is-negativo' : 'is-positivo'}>
              {sinal > 0 ? '+' : '−'}
              {Math.abs(sinal)}
            </strong>
            <span>
              {m.cor_nome || m.cor} · {m.tam}
            </span>
            <span className="entradas__mov-info">
              {formatarDataHora(m.data_hora)}
              {m.usuario && ` · ${m.usuario}`}
              {m.pedido && ` · venda ${m.pedido}`}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
