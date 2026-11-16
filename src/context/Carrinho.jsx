'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CHAVE = 'jlk-carrinho'
const CHAVE_REMOVIDOS = 'jlk-carrinho-removidos' // aviso fica guardado até a pessoa ver no carrinho
const CarrinhoContext = createContext(null)

export const idItem = (slug, cor, tamanho) => `${slug}|${cor}|${tamanho}`

// O carrinho fica salvo no navegador do cliente (sobrevive a recarregar a página).
// Cada item guarda uma cópia de nome/preço/imagem para aparecer na hora; assim que o catálogo
// (banco) chega, os dados são atualizados e saem os itens cuja variação não existe mais no site.
export function CarrinhoProvider({ children }) {
  const [itens, setItens] = useState([])
  const [carregado, setCarregado] = useState(false)
  const [catalogo, setCatalogo] = useState(null) // { [slug]: produto }
  const [removidos, setRemovidos] = useState([]) // itens tirados porque a variação saiu do site

  // Lê o carrinho salvo só no navegador (no servidor não existe localStorage)
  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE) || '[]')
      if (Array.isArray(salvo)) setItens(salvo.filter((i) => i && i.slug && i.cor && i.tamanho && i.quantidade > 0))
      const fora = JSON.parse(localStorage.getItem(CHAVE_REMOVIDOS) || '[]')
      if (Array.isArray(fora)) setRemovidos(fora)
    } catch {
      /* armazenamento indisponível: começa vazio */
    }
    setCarregado(true)
  }, [])

  // Catálogo atual (preços, estoque e variações que existem)
  useEffect(() => {
    if (!carregado || !itens.length || catalogo) return
    fetch('/api/produtos')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setCatalogo(Object.fromEntries((d.produtos ?? []).map((p) => [p.slug, p]))))
      .catch(() => {
        /* sem conexão: segue com as cópias salvas; o pedido é conferido no servidor */
      })
  }, [carregado, itens.length, catalogo])

  // Com o catálogo em mãos: atualiza os itens e tira os que não existem mais
  useEffect(() => {
    if (!catalogo) return
    setItens((atual) => {
      const fora = []
      const novos = []
      for (const i of atual) {
        const p = catalogo[i.slug]
        const estoque = p?.estoque?.[i.cor]?.[i.tamanho]
        if (!p || estoque === undefined) {
          fora.push(i)
          continue
        }
        novos.push({ ...i, nome: p.nome, preco: p.preco, precoAnterior: p.precoAnterior, imagem: p.imagem, quantidade: Math.max(1, Math.min(i.quantidade, estoque || 1)) })
      }
      if (fora.length) setRemovidos((antes) => [...antes, ...fora])
      return fora.length || novos.some((n, k) => n !== atual[k]) ? novos : atual
    })
  }, [catalogo])

  useEffect(() => {
    if (!carregado) return
    try {
      localStorage.setItem(CHAVE_REMOVIDOS, JSON.stringify(removidos))
    } catch {
      /* sem armazenamento */
    }
  }, [removidos, carregado])

  useEffect(() => {
    if (!carregado) return
    try {
      localStorage.setItem(CHAVE, JSON.stringify(itens))
    } catch {
      /* navegador sem armazenamento: o carrinho só vale nesta visita */
    }
  }, [itens, carregado])

  const valor = useMemo(() => {
    // Estoque atual da variação (catálogo); antes de ele chegar, usa o limite guardado no item
    const estoqueDe = (slug, cor, tamanho) => {
      const q = catalogo?.[slug]?.estoque?.[cor]?.[tamanho]
      if (q !== undefined) return q
      return itens.find((i) => idItem(i.slug, i.cor, i.tamanho) === idItem(slug, cor, tamanho))?.limite ?? 99
    }

    const detalhados = itens.map((i) => ({ ...i, id: idItem(i.slug, i.cor, i.tamanho) }))

    return {
      carregado,
      itens: detalhados,
      removidos,
      quantidadeTotal: itens.reduce((s, i) => s + i.quantidade, 0),
      total: detalhados.reduce((s, i) => s + i.preco * i.quantidade, 0),
      estoqueDe,

      // produto: objeto do catálogo (página do produto)
      adicionar(produto, cor, tamanho, quantidade) {
        const limite = produto.estoque?.[cor]?.[tamanho] ?? 0
        if (limite <= 0) return
        const dados = { nome: produto.nome, preco: produto.preco, precoAnterior: produto.precoAnterior ?? null, imagem: produto.imagem, limite }
        setItens((atual) => {
          const id = idItem(produto.slug, cor, tamanho)
          const existente = atual.find((i) => idItem(i.slug, i.cor, i.tamanho) === id)
          if (existente) {
            return atual.map((i) => (i === existente ? { ...i, ...dados, quantidade: Math.min(limite, i.quantidade + quantidade) } : i))
          }
          return [...atual, { slug: produto.slug, cor, tamanho, quantidade: Math.min(limite, quantidade), ...dados }]
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

      dispensarRemovidos() {
        setRemovidos([])
      },
    }
  }, [itens, carregado, catalogo, removidos])

  return <CarrinhoContext.Provider value={valor}>{children}</CarrinhoContext.Provider>
}

export const useCarrinho = () => useContext(CarrinhoContext)
