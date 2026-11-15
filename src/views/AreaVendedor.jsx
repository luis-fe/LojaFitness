'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import './AreaVendedor.css'
import { useAutenticacao } from '@/context/Autenticacao'
import CardsMenu from '@/components/CardsMenu'
import { IconePerfil, IconeProdutos, IconeSite } from '@/components/Icones'

const horario = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

const cardsPrincipais = (ehAdmin) => [
  {
    titulo: 'Perfil',
    descricao: 'Seus dados de acesso e o cadastro de novos vendedores.',
    href: '/area-do-vendedor/perfil',
    Icone: IconePerfil,
  },
  {
    titulo: 'Produtos',
    descricao: 'Fotos dos produtos e campanhas de desconto.',
    href: '/area-do-vendedor/produtos',
    Icone: IconeProdutos,
  },
  {
    titulo: 'Meu Site',
    descricao: 'Monte e publique o layout da página inicial da loja.',
    href: '/area-do-vendedor/layout-site',
    Icone: IconeSite,
    bloqueado: !ehAdmin,
    motivo: 'Somente administradores',
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

  if (erro)
    return (
      <p className="resumo-loja__erro" role="alert">
        {erro}
      </p>
    )
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
            {dados.estoqueBaixo.length} variaç{dados.estoqueBaixo.length === 1 ? 'ão' : 'ões'} com estoque baixo ou
            esgotado
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

      <CardsMenu rotulo="Menu da Área do Vendedor" itens={cardsPrincipais(vendedor?.papel === 'admin')} />

      <section className="vendedor__resumo" aria-labelledby="resumo-titulo">
        <h2 id="resumo-titulo" className="vendedor__subtitulo">
          Resumo da loja
        </h2>
        <Resumo />
      </section>
    </section>
  )
}
