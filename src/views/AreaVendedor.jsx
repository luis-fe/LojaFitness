'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import './AreaVendedor.css'
import { useAutenticacao } from '@/context/Autenticacao'

const horario = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

const IconeImagem = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
)

const IconeCampanha = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
)

const Seta = () => (
  <svg className="topico__seta" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
)

const topicos = [
  {
    titulo: 'Carregar imagens',
    descricao: 'Envie e organize as fotos dos seus produtos.',
    href: '/area-do-vendedor/carregar-imagens',
    Icone: IconeImagem,
  },
  {
    titulo: 'Cadastrar Campanhas',
    descricao: 'Crie promoções, defina descontos e período de validade.',
    href: '/area-do-vendedor/cadastrar-campanhas',
    Icone: IconeCampanha,
  },
]

function Resumo() {
  const { fetchAutenticado } = useAutenticacao()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    fetchAutenticado('/api/vendedor/resumo')
      .then(async (r) => {
        const corpo = await r.json().catch(() => ({}))
        if (!ativo) return
        if (r.ok) setDados(corpo)
        else setErro(corpo.erro || 'Não foi possível carregar o resumo.')
      })
      .catch(() => ativo && setErro('Sem conexão com o servidor.'))
    return () => {
      ativo = false
    }
  }, [fetchAutenticado])

  if (erro) return <p className="resumo-loja__erro" role="alert">{erro}</p>
  if (!dados) return <div className="resumo-loja resumo-loja--carregando" aria-busy="true" />

  return (
    <>
      <dl className="resumo-loja">
        <div>
          <dt>Produtos ativos</dt>
          <dd>{dados.produtosAtivos}</dd>
        </div>
        <div>
          <dt>Peças disponíveis</dt>
          <dd>{dados.pecasDisponiveis}</dd>
        </div>
        <div>
          <dt>Pedidos aguardando</dt>
          <dd>{dados.pedidosAguardando}</dd>
        </div>
      </dl>
      {dados.estoqueBaixo.length > 0 && (
        <details className="estoque-baixo">
          <summary>
            {dados.estoqueBaixo.length} variaç{dados.estoqueBaixo.length === 1 ? 'ão' : 'ões'} com estoque baixo ou esgotado
          </summary>
          <ul>
            {dados.estoqueBaixo.map((v) => (
              <li key={`${v.nome}-${v.cor}-${v.tamanho}`}>
                <span>
                  {v.nome} · {v.cor} · {v.tamanho}
                </span>
                <strong>{v.estoque === 0 ? 'Esgotado' : `${v.estoque} disp.`}</strong>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  )
}

export default function AreaVendedor() {
  const { vendedor, sessao, sair } = useAutenticacao()

  return (
    <section className="vendedor" aria-labelledby="vendedor-titulo">
      <nav className="vendedor__breadcrumb" aria-label="Você está em">
        <Link href="/">Início</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Área do Vendedor</span>
      </nav>

      <div className="vendedor__sessao">
        <span>
          Olá, <strong>{vendedor?.nome_fantasia || vendedor?.nome}</strong> · sessão até {horario(sessao.expiraEm)}
        </span>
        <button type="button" onClick={sair} className="vendedor__sair">
          Sair
        </button>
      </div>

      <header className="vendedor__cabecalho">
        <h1 id="vendedor-titulo">Área do Vendedor</h1>
        <p>Escolha o que você quer fazer.</p>
      </header>

      <Resumo />

      <ul className="topicos">
        {topicos.map(({ titulo, descricao, href, Icone }) => (
          <li key={titulo}>
            <Link href={href} className="topico">
              <span className="topico__icone">
                <Icone />
              </span>
              <span className="topico__texto">
                <span className="topico__titulo">{titulo}</span>
                <span className="topico__descricao">{descricao}</span>
              </span>
              <Seta />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
