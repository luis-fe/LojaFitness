'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const CHAVE = 'jlk-sessao'
const AutenticacaoContext = createContext(null)

function lerSessaoSalva() {
  try {
    const sessao = JSON.parse(localStorage.getItem(CHAVE) || 'null')
    if (sessao?.token && sessao.vendedor && new Date(sessao.expiraEm) > new Date()) return sessao
    localStorage.removeItem(CHAVE)
  } catch {
    /* armazenamento indisponível */
  }
  return null
}

// Guarda o token JWT da Área do Vendedor e o envia como "Authorization: Bearer" nas APIs.
export function AutenticacaoProvider({ children }) {
  const [sessao, setSessao] = useState(null) // { token, expiraEm, vendedor }
  const [carregado, setCarregado] = useState(false)

  useEffect(() => {
    setSessao(lerSessaoSalva())
    setCarregado(true)
  }, [])

  const sair = useCallback(() => {
    setSessao(null)
    try {
      localStorage.removeItem(CHAVE)
    } catch {
      /* ignora */
    }
  }, [])

  // Encerra a sessão sozinho quando o token expira (3 horas)
  useEffect(() => {
    if (!sessao) return
    const restante = new Date(sessao.expiraEm).getTime() - Date.now()
    const id = setTimeout(sair, Math.max(0, Math.min(restante, 2 ** 31 - 1)))
    return () => clearTimeout(id)
  }, [sessao, sair])

  const entrar = useCallback(async (login, senha) => {
    const resposta = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, senha }),
    })
    const dados = await resposta.json().catch(() => ({}))
    if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível entrar.')

    const nova = { token: dados.token, expiraEm: dados.expiraEm, vendedor: dados.vendedor }
    setSessao(nova)
    try {
      localStorage.setItem(CHAVE, JSON.stringify(nova))
    } catch {
      /* sem armazenamento: a sessão vale só nesta aba */
    }
    return nova
  }, [])

  // fetch que já envia o token. Se a API responder 401 (expirado/inválido), encerra a sessão.
  const fetchAutenticado = useCallback(
    async (url, opcoes = {}) => {
      const resposta = await fetch(url, {
        ...opcoes,
        headers: { ...opcoes.headers, ...(sessao ? { Authorization: `Bearer ${sessao.token}` } : {}) },
      })
      if (resposta.status === 401) sair()
      return resposta
    },
    [sessao, sair]
  )

  // Atalho para APIs JSON: devolve { ok, status, dados }
  const api = useCallback(
    async (url, { metodo = 'GET', corpo } = {}) => {
      try {
        const resposta = await fetchAutenticado(url, {
          method: metodo,
          headers: corpo === undefined ? undefined : { 'Content-Type': 'application/json' },
          body: corpo === undefined ? undefined : JSON.stringify(corpo),
        })
        const texto = await resposta.text()
        let dados = null
        try {
          dados = texto ? JSON.parse(texto) : null
        } catch {
          dados = null
        }
        return { ok: resposta.ok, status: resposta.status, dados }
      } catch {
        return { ok: false, status: 0, dados: { erro: 'Sem conexão com o servidor.' } }
      }
    },
    [fetchAutenticado]
  )

  // Atualiza os dados do vendedor guardados na sessão (ex.: depois de editar o perfil)
  const atualizarVendedorSessao = useCallback((parcial) => {
    setSessao((atual) => {
      if (!atual) return atual
      const nova = { ...atual, vendedor: { ...atual.vendedor, ...parcial } }
      try {
        localStorage.setItem(CHAVE, JSON.stringify(nova))
      } catch {
        /* ignora */
      }
      return nova
    })
  }, [])

  const valor = useMemo(
    () => ({
      carregado,
      sessao,
      vendedor: sessao?.vendedor ?? null,
      autenticado: Boolean(sessao),
      entrar,
      sair,
      fetchAutenticado,
      api,
      atualizarVendedorSessao,
    }),
    [carregado, sessao, entrar, sair, fetchAutenticado, api, atualizarVendedorSessao]
  )

  return <AutenticacaoContext.Provider value={valor}>{children}</AutenticacaoContext.Provider>
}

export const useAutenticacao = () => useContext(AutenticacaoContext)
