import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { buscarProduto } from '../data/produtos.js'

const CHAVE = 'jlk-carrinho'
const CarrinhoContext = createContext(null)

// O carrinho fica salvo no navegador do cliente (sobrevive a recarregar a página)
function carregar() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || '[]')
    return Array.isArray(salvo) ? salvo.filter((i) => buscarProduto(i.slug)) : []
  } catch {
    return []
  }
}

export const idItem = (slug, cor, tamanho) => `${slug}|${cor}|${tamanho}`

export function estoqueDe(slug, cor, tamanho) {
  return buscarProduto(slug)?.estoque[cor]?.[tamanho] ?? 0
}

export function CarrinhoProvider({ children }) {
  const [itens, setItens] = useState(carregar)

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(itens))
    } catch {
      /* navegador sem armazenamento: o carrinho só vale nesta visita */
    }
  }, [itens])

  const valor = useMemo(() => {
    // Junta dados do produto (nome, preço, imagem) a cada item salvo
    const detalhados = itens.map((i) => {
      const p = buscarProduto(i.slug)
      return { ...i, id: idItem(i.slug, i.cor, i.tamanho), nome: p.nome, preco: p.preco, imagem: p.imagem }
    })

    return {
      itens: detalhados,
      quantidadeTotal: itens.reduce((s, i) => s + i.quantidade, 0),
      total: detalhados.reduce((s, i) => s + i.preco * i.quantidade, 0),

      adicionar(slug, cor, tamanho, quantidade) {
        const limite = estoqueDe(slug, cor, tamanho)
        setItens((atual) => {
          const id = idItem(slug, cor, tamanho)
          const existente = atual.find((i) => idItem(i.slug, i.cor, i.tamanho) === id)
          if (existente) {
            return atual.map((i) =>
              i === existente ? { ...i, quantidade: Math.min(limite, i.quantidade + quantidade) } : i
            )
          }
          return [...atual, { slug, cor, tamanho, quantidade: Math.min(limite, quantidade) }]
        })
      },

      alterarQuantidade(id, quantidade) {
        setItens((atual) =>
          atual.map((i) => {
            if (idItem(i.slug, i.cor, i.tamanho) !== id) return i
            const limite = estoqueDe(i.slug, i.cor, i.tamanho)
            return { ...i, quantidade: Math.max(1, Math.min(limite, quantidade)) }
          })
        )
      },

      remover(id) {
        setItens((atual) => atual.filter((i) => idItem(i.slug, i.cor, i.tamanho) !== id))
      },

      limpar() {
        setItens([])
      },
    }
  }, [itens])

  return <CarrinhoContext.Provider value={valor}>{children}</CarrinhoContext.Provider>
}

export const useCarrinho = () => useContext(CarrinhoContext)
