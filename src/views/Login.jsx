'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import '@/components/Formulario.css'
import './Login.css'
import { useAutenticacao } from '@/context/Autenticacao'
import { IconeOlho, IconeOlhoFechado } from '@/components/Icones'

export default function Login() {
  const { entrar, autenticado, carregado } = useAutenticacao()
  const router = useRouter()
  const params = useSearchParams()
  const voltar = params.get('voltar')
  // Só aceita voltar para páginas da própria área (evita redirecionar para outro site)
  const destino = voltar?.startsWith('/area-do-vendedor') ? voltar : '/area-do-vendedor'

  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Já está logado? Vai direto para a área
  useEffect(() => {
    if (carregado && autenticado) router.replace(destino)
  }, [carregado, autenticado, destino, router])

  const aoEnviar = async (e) => {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      await entrar(login, senha)
      router.replace(destino)
    } catch (falha) {
      setErro(falha.message)
      setSenha('')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="login" aria-labelledby="login-titulo">
      <div className="login__caixa">
        <span className="login__selo">Área do Vendedor</span>
        <h1 id="login-titulo" className="login__titulo">Entrar</h1>

        <form className="login__form" onSubmit={aoEnviar} noValidate>
          <div className="campo">
            <label htmlFor="login">Login</label>
            <input
              id="login"
              name="login"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              aria-invalid={Boolean(erro) || undefined}
            />
          </div>

          <div className="campo">
            <label htmlFor="senha">Senha</label>
            <div className="campo__senha">
              <input
                id="senha"
                name="senha"
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                aria-invalid={Boolean(erro) || undefined}
                aria-describedby={erro ? 'login-erro' : undefined}
              />
              <button
                type="button"
                className="campo__mostrar"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-pressed={mostrarSenha}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {mostrarSenha ? <IconeOlhoFechado /> : <IconeOlho />}
              </button>
            </div>
          </div>

          {erro && (
            <p id="login-erro" className="login__erro" role="alert">
              {erro}
            </p>
          )}

          <button type="submit" className="login__btn" disabled={enviando || !login || !senha}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="login__rodape">
          Por segurança, a sessão expira em 3 horas. <Link href="/">Voltar para a loja</Link>
        </p>
      </div>
    </section>
  )
}
