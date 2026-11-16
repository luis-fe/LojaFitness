'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import './Produto.css'
import { formatarPreco, situacaoVariacao } from '@/lib/produtos'
import Preco from '@/components/Preco'
import { linkWhatsApp, mensagemPedido } from '@/lib/whatsapp'
import { useCarrinho } from '@/context/Carrinho'
import IconeWhatsApp from '@/components/IconeWhatsApp'

// produto: vem do cadastro (banco) — veja src/server/servicos/CatalogoServico.js
export default function Produto({ produto }) {
  const [selecao, setSelecao] = useState(null) // { cor, tamanho }
  const [quantidade, setQuantidade] = useState(1)
  const [adicionado, setAdicionado] = useState(false)
  const carrinho = useCarrinho()

  // Esconde o aviso de "adicionado" depois de alguns segundos
  useEffect(() => {
    if (!adicionado) return
    const id = setTimeout(() => setAdicionado(false), 5000)
    return () => clearTimeout(id)
  }, [adicionado])

  if (!produto) {
    return (
      <section className="produto produto--vazio">
        <h1>Produto não encontrado</h1>
        <Link href="/#novidades" className="produto__btn">Ver novidades</Link>
      </section>
    )
  }

  const TAMANHOS = produto.tamanhos
  const qtd = (cor, tam) => situacaoVariacao(produto, cor, tam).quantidade
  const totalCor = (cor) => TAMANHOS.reduce((s, t) => s + qtd(cor, t), 0)
  const qtdSelecionada = selecao ? qtd(selecao.cor, selecao.tamanho) : 0
  const total = produto.preco * quantidade

  const escolher = (cor, tamanho) => {
    setSelecao({ cor, tamanho })
    setAdicionado(false)
    setQuantidade((q) => Math.min(q, qtd(cor, tamanho)))
  }

  const mensagem = selecao
    ? mensagemPedido([{ nome: produto.nome, preco: produto.preco, quantidade, ...selecao }])
    : ''

  const adicionarAoCarrinho = () => {
    carrinho.adicionar(produto, selecao.cor, selecao.tamanho, quantidade)
    setAdicionado(true)
  }

  return (
    <section className="produto" aria-labelledby="produto-nome">
      <div className="produto__imagem">
        <img src={produto.imagem} alt={`${produto.nome} JLK`} loading="eager" fetchPriority="high" />
      </div>

      <div className="produto__info">
        <nav className="produto__breadcrumb" aria-label="Você está em">
          <Link href="/">Início</Link>
          <span aria-hidden="true">/</span>
          <Link href="/#novidades">Novidades</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{produto.nome}</span>
        </nav>

        <h1 id="produto-nome" className="produto__nome">{produto.nome}</h1>
        <p className="produto__descricao">{produto.descricao}</p>

        <h2 className="produto__subtitulo">Escolha a cor e o tamanho</h2>

        <div className="grade" role="region" aria-label="Cores, tamanhos e quantidade disponível" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col" className="grade__canto">Cor</th>
                {TAMANHOS.map((t) => (
                  <th key={t} scope="col">{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {produto.cores.map((cor) => (
                <tr key={cor.nome}>
                  <th scope="row" className="grade__cor">
                    <span className="grade__amostra" style={{ background: cor.hex }} aria-hidden="true" />
                    <span>
                      {cor.nome}
                      <small>
                        {totalCor(cor.nome)} <span>disponíveis</span>
                      </small>
                    </span>
                  </th>
                  {TAMANHOS.map((tam) => {
                    const { situacao, quantidade: q } = situacaoVariacao(produto, cor.nome, tam)
                    const naoPossui = situacao === 'nao-possui' // a cor não tem este tamanho no cadastro
                    const esgotado = situacao === 'esgotado'
                    const baixo = situacao === 'baixo'
                    const ativo = selecao?.cor === cor.nome && selecao?.tamanho === tam
                    const descricao = naoPossui ? 'não possui' : esgotado ? 'esgotado' : `${q} ${q === 1 ? 'disponível' : 'disponíveis'}`
                    return (
                      <td key={tam}>
                        <button
                          type="button"
                          className={`grade__celula ${ativo ? 'is-ativo' : ''} ${baixo ? 'is-baixo' : ''} ${naoPossui ? 'is-nao-possui' : ''}`}
                          disabled={naoPossui || esgotado}
                          aria-pressed={ativo}
                          aria-label={`${cor.nome}, tamanho ${tam}: ${descricao}`}
                          onClick={() => escolher(cor.nome, tam)}
                        >
                          <span className="grade__qtd">{naoPossui || esgotado ? '—' : q}</span>
                          <span className="grade__rotulo">
                            {naoPossui ? 'Não possui' : esgotado ? 'Esgotado' : baixo ? 'Últimas' : q === 1 ? 'Disponível' : 'Disponíveis'}
                          </span>
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="produto__selecao" aria-live="polite">
          {selecao ? (
            <>
              Selecionado: <strong>{selecao.cor} · {selecao.tamanho}</strong> — {qtdSelecionada}{' '}
              {qtdSelecionada === 1 ? 'unidade disponível' : 'unidades disponíveis'}
            </>
          ) : (
            'Toque em uma célula para escolher cor e tamanho.'
          )}
        </p>

        <div className="produto__compra">
          <div className="produto__linha">
            <div className="produto__preco">
              <span className="produto__preco-rotulo">Preço</span>
              <strong>
                <Preco produto={produto} grande />
              </strong>
            </div>

            <div className="quantidade">
              <span className="produto__preco-rotulo" id="qtd-rotulo">Quantidade</span>
              <div className="quantidade__controle" role="group" aria-labelledby="qtd-rotulo">
                <button
                  type="button"
                  aria-label="Diminuir quantidade"
                  disabled={!selecao || quantidade <= 1}
                  onClick={() => setQuantidade((q) => q - 1)}
                >
                  −
                </button>
                <output aria-live="polite">{quantidade}</output>
                <button
                  type="button"
                  aria-label="Aumentar quantidade"
                  disabled={!selecao || quantidade >= qtdSelecionada}
                  onClick={() => setQuantidade((q) => q + 1)}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {quantidade > 1 && (
            <p className="produto__total">
              Total: <strong>{formatarPreco(total)}</strong>
            </p>
          )}

          <button
            type="button"
            className="produto__btn"
            disabled={!selecao}
            onClick={adicionarAoCarrinho}
          >
            {selecao ? 'Adicionar ao carrinho' : 'Selecione cor e tamanho'}
          </button>

          {adicionado && (
            <p className="produto__adicionado" role="status">
              ✓ Adicionado ao carrinho. <Link href="/carrinho">Ver carrinho</Link>
            </p>
          )}

          {selecao ? (
            <a
              className="produto__btn produto__btn--whats"
              href={linkWhatsApp(mensagem)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconeWhatsApp className="produto__whats-icone" />
              Comprar direto pelo WhatsApp
            </a>
          ) : null}
          {selecao && (
            <p className="produto__aviso">
              Adicione ao carrinho para comprar vários itens, ou compre só este direto pelo WhatsApp.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
