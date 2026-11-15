'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import './Carrinho.css'
import { useCarrinho, estoqueDe } from '@/context/Carrinho'
import { formatarPreco } from '@/lib/produtos'
import IconeWhatsApp from '@/components/IconeWhatsApp'

export default function Carrinho() {
  const { carregado, itens, total, quantidadeTotal, alterarQuantidade, remover } = useCarrinho()
  const [enviando, setEnviando] = useState(false)
  const [erros, setErros] = useState([])

  // Envia o pedido ao backend, que confere estoque, recalcula o total
  // e devolve o link do WhatsApp com a mensagem pronta.
  const finalizar = async () => {
    setErros([])
    setEnviando(true)
    // Abre a aba já no clique (senão o navegador bloqueia como pop-up)
    const aba = window.open('', '_blank')
    try {
      const resposta = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itens: itens.map(({ slug, cor, tamanho, quantidade }) => ({ slug, cor, tamanho, quantidade })),
        }),
      })
      const dados = await resposta.json()
      if (!resposta.ok) {
        aba?.close()
        setErros(dados.erros || ['Não foi possível finalizar o pedido.'])
        return
      }
      if (aba) aba.location.href = dados.whatsappUrl
      else window.location.href = dados.whatsappUrl
    } catch {
      aba?.close()
      setErros(['Sem conexão. Verifique sua internet e tente de novo.'])
    } finally {
      setEnviando(false)
    }
  }

  // Evita mostrar "carrinho vazio" antes de ler o que está salvo no navegador
  if (!carregado) {
    return <section className="carrinho" aria-busy="true" />
  }

  if (itens.length === 0) {
    return (
      <section className="carrinho carrinho--vazio" aria-labelledby="carrinho-titulo">
        <h1 id="carrinho-titulo" className="carrinho__titulo">Seu carrinho está vazio</h1>
        <p>Veja as novidades e escolha seu próximo conjunto.</p>
        <Link href="/#novidades" className="carrinho__btn">Ver novidades</Link>
      </section>
    )
  }

  return (
    <section className="carrinho" aria-labelledby="carrinho-titulo">
      <div className="carrinho__cabecalho">
        <h1 id="carrinho-titulo" className="carrinho__titulo">Seu pedido</h1>
        <span className="carrinho__contagem">
          {quantidadeTotal} {quantidadeTotal === 1 ? 'item' : 'itens'}
        </span>
      </div>

      <div className="carrinho__grade">
        <ul className="carrinho__lista">
          {itens.map((item) => {
            const limite = estoqueDe(item.slug, item.cor, item.tamanho)
            return (
              <li key={item.id} className="item">
                <Link href={`/produto/${item.slug}`} className="item__imagem">
                  <Image src={item.imagem} alt={item.nome} sizes="110px" />
                </Link>

                <div className="item__info">
                  <Link href={`/produto/${item.slug}`} className="item__nome">{item.nome}</Link>
                  <span className="item__detalhe">
                    Cor: {item.cor} · Tamanho: {item.tamanho}
                  </span>
                  <span className="item__detalhe">{formatarPreco(item.preco)} cada</span>

                  <div className="item__acoes">
                    <div className="item__qtd" role="group" aria-label={`Quantidade de ${item.nome}`}>
                      <button
                        type="button"
                        aria-label="Diminuir quantidade"
                        disabled={item.quantidade <= 1}
                        onClick={() => alterarQuantidade(item.id, item.quantidade - 1)}
                      >
                        −
                      </button>
                      <output aria-live="polite">{item.quantidade}</output>
                      <button
                        type="button"
                        aria-label="Aumentar quantidade"
                        disabled={item.quantidade >= limite}
                        onClick={() => alterarQuantidade(item.id, item.quantidade + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button type="button" className="item__remover" onClick={() => remover(item.id)}>
                      Remover
                    </button>
                  </div>
                </div>

                <strong className="item__subtotal">{formatarPreco(item.preco * item.quantidade)}</strong>
              </li>
            )
          })}
        </ul>

        <aside className="resumo" aria-label="Resumo do pedido">
          <h2 className="resumo__titulo">Resumo</h2>
          <dl>
            <div>
              <dt>Produtos ({quantidadeTotal})</dt>
              <dd>{formatarPreco(total)}</dd>
            </div>
            <div>
              <dt>Frete</dt>
              <dd>Combinar no WhatsApp</dd>
            </div>
            <div className="resumo__total">
              <dt>Total</dt>
              <dd>{formatarPreco(total)}</dd>
            </div>
          </dl>

          {erros.length > 0 && (
            <div className="resumo__erros" role="alert">
              {erros.map((e) => (
                <p key={e}>{e}</p>
              ))}
            </div>
          )}

          <button
            type="button"
            className="carrinho__btn carrinho__btn--whats"
            onClick={finalizar}
            disabled={enviando}
          >
            <IconeWhatsApp className="carrinho__whats-icone" />
            {enviando ? 'Conferindo pedido…' : 'Finalizar pelo WhatsApp'}
          </button>
          <p className="resumo__aviso">O pedido completo vai pronto na mensagem.</p>
          <Link href="/#novidades" className="resumo__continuar">Continuar comprando</Link>
        </aside>
      </div>
    </section>
  )
}
