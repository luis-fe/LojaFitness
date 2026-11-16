'use client'

import { useEffect, useState } from 'react'
import './AreaVendedor.css'
import { useAutenticacao } from '@/context/Autenticacao'
import { useErro } from '@/context/Erro'
import CardsMenu from '@/components/CardsMenu'
import { IconeRosto, IconeProdutos, IconeSite, IconeVisitantes, IconeVariacoes } from '@/components/Icones'

const horario = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const numero = (n) => Number(n ?? 0).toLocaleString('pt-BR')

const iniciais = (nome = '') =>
  nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?'

const cardsMenu = (ehAdmin) => [
  { titulo: 'Perfil', href: '/area-do-vendedor/perfil', Icone: IconeRosto, cor: 'azul' },
  { titulo: 'Produtos', href: '/area-do-vendedor/produtos', Icone: IconeProdutos, cor: 'dourado' },
  { titulo: 'Meu Site', href: '/area-do-vendedor/layout-site', Icone: IconeSite, cor: 'roxo', bloqueado: !ehAdmin, motivo: 'Somente administradores' },
]

// Tempo restante da sessão, atualizado a cada minuto
function useTempoRestante(expiraEm) {
  const calcular = () => Math.max(0, new Date(expiraEm).getTime() - Date.now())
  const [restante, setRestante] = useState(calcular)
  useEffect(() => {
    const id = setInterval(() => setRestante(calcular()), 60_000)
    return () => clearInterval(id)
  }, [expiraEm]) // eslint-disable-line react-hooks/exhaustive-deps
  const min = Math.round(restante / 60_000)
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`
}

function CardUsuario() {
  const { vendedor, sessao, sair } = useAutenticacao()
  const nome = vendedor?.nome_fantasia || vendedor?.nome || ''
  const restante = useTempoRestante(sessao.expiraEm)

  return (
    <section className="card-usuario" aria-label="Sua sessão">
      <span className="card-usuario__avatar" aria-hidden="true">
        {iniciais(nome)}
      </span>
      <div className="card-usuario__dados">
        <strong className="card-usuario__nome">{nome}</strong>
        <span className="card-usuario__papel">{vendedor?.papel === 'admin' ? 'Administrador' : 'Vendedor'}</span>
      </div>
      <div className="card-usuario__sessao">
        <span className="card-usuario__rotulo">Sessão até</span>
        <strong>{horario(sessao.expiraEm)}</strong>
        <span className="card-usuario__restante">restam {restante}</span>
      </div>
      <button type="button" onClick={sair} className="card-usuario__sair">
        Sair
      </button>
    </section>
  )
}

function Indicadores() {
  const { api } = useAutenticacao()
  const [dados, setDados] = useState(null)
  const { mostrarErro } = useErro()

  useEffect(() => {
    api('/api/vendedor/resumo').then(({ ok, dados: d }) => {
      if (ok) setDados(d)
      else mostrarErro(d?.erro || 'Não foi possível carregar os indicadores.')
    })
  }, [api, mostrarErro])

  const itens = [
    { rotulo: 'Produtos em anúncio', valor: dados?.produtosEmAnuncio, Icone: IconeProdutos },
    {
      rotulo: 'Visitantes da última semana',
      valor: dados?.visitantesSemana,
      detalhe: dados && `${numero(dados.visitasSemana)} ${dados.visitasSemana === 1 ? 'visita' : 'visitas'}`,
      Icone: IconeVisitantes,
    },
    {
      rotulo: 'Variações em anúncio',
      valor: dados?.variacoesEmAnuncio,
      detalhe: dados && `${numero(dados.variacoesComEstoque)} com estoque`,
      Icone: IconeVariacoes,
    },
  ]

  return (
    <dl className="indicadores" aria-busy={!dados}>
      {itens.map(({ rotulo, valor, detalhe, Icone }) => (
        <div key={rotulo} className="indicador">
          <span className="indicador__icone" aria-hidden="true">
            <Icone />
          </span>
          <dt>{rotulo}</dt>
          <dd>
            {dados ? <span className="indicador__valor">{numero(valor)}</span> : <span className="indicador__carregando" />}
            {detalhe && <span className="indicador__detalhe">{detalhe}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export default function AreaVendedor() {
  const { vendedor } = useAutenticacao()

  return (
    <section className="vendedor" aria-labelledby="vendedor-titulo">
      <CardUsuario />

      <h1 id="vendedor-titulo" className="vendedor__titulo">
        Área do Vendedor
      </h1>

      <CardsMenu rotulo="Menu da Área do Vendedor" itens={cardsMenu(vendedor?.papel === 'admin')} />

      <section className="vendedor__indicadores" aria-labelledby="indicadores-titulo">
        <h2 id="indicadores-titulo" className="sr-only">
          Indicadores da loja
        </h2>
        <Indicadores />
      </section>
    </section>
  )
}
