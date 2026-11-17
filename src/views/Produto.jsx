'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import './Produto.css'
import { formatarPreco, situacaoVariacao } from '@/lib/produtos'
import Preco from '@/components/Preco'
import { useCarrinho } from '@/context/Carrinho'
import IconeWhatsApp from '@/components/IconeWhatsApp'
import DadosCliente, { useDadosCliente } from '@/components/DadosCliente'
import FormaEnvio from '@/components/FormaEnvio'
import { FRETE_PADRAO } from '@/lib/frete'

const RETIRAR = 1 // "Retirar c/ vendedor": sem frete para calcular
import { useErro } from '@/context/Erro'

// Junta as peças escolhidas por cor + tamanho: [{ cor, tamanho, quantidade }]
const agrupar = (escolhas) => {
  const grupos = new Map()
  for (const e of escolhas) {
    const chave = `${e.cor}|${e.tamanho}`
    grupos.set(chave, { ...e, quantidade: (grupos.get(chave)?.quantidade ?? 0) + 1 })
  }
  return [...grupos.values()]
}

// Página do produto (dados do cadastro):
//   nome → descrição → preço e quantidade → grade de cor × tamanho.
//   Com quantidade maior que 1, cada toque na grade escolhe uma peça ("escolha o próximo produto").
export default function Produto({ produto }) {
  const [quantidade, setQuantidade] = useState(1)
  const [gradeAberta, setGradeAberta] = useState(false)
  const [escolhas, setEscolhas] = useState([]) // [{ cor, tamanho }] — uma por peça
  const [adicionado, setAdicionado] = useState(false)
  const carrinho = useCarrinho()
  const { mostrarErro } = useErro()
  const { cliente, setCliente, dados: dadosCliente, completo, lembrar } = useDadosCliente()
  const [frete, setFrete] = useState(FRETE_PADRAO)
  const [comprandoDireto, setComprandoDireto] = useState(false)
  const [enviando, setEnviando] = useState(false)

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
        <Link href="/#novidades" className="produto__btn">
          Ver novidades
        </Link>
      </section>
    )
  }

  const TAMANHOS = produto.tamanhos
  const qtd = (cor, tam) => situacaoVariacao(produto, cor, tam).quantidade
  const totalCor = (cor) => TAMANHOS.reduce((s, t) => s + qtd(cor, t), 0)
  const estoqueTotal = produto.cores.reduce((s, c) => s + totalCor(c.nome), 0)
  const escolhidasDe = (cor, tam) => escolhas.filter((e) => e.cor === cor && e.tamanho === tam).length
  const completo_ = escolhas.length === quantidade
  const faltam = quantidade - escolhas.length
  const grupos = agrupar(escolhas)

  const mudarQuantidade = (q) => {
    const nova = Math.max(1, Math.min(estoqueTotal, q))
    setQuantidade(nova)
    setEscolhas((es) => es.slice(0, nova)) // menos peças: tira as últimas escolhidas
    setAdicionado(false)
  }

  const escolher = (cor, tamanho) => {
    setAdicionado(false)
    setEscolhas((es) => {
      if (quantidade === 1) return [{ cor, tamanho }] // 1 peça: tocar em outra célula troca a escolha
      if (es.length >= quantidade) return es
      return [...es, { cor, tamanho }]
    })
  }

  const removerEscolha = (i) => setEscolhas((es) => es.filter((_, n) => n !== i))

  // Compra direta: o servidor confere estoque e preço, grava cliente e pedido e devolve o link do WhatsApp
  const comprarDireto = async () => {
    setEnviando(true)
    const aba = window.open('', '_blank') // abre já no clique (senão o navegador bloqueia)
    try {
      const resposta = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens: grupos.map((g) => ({ slug: produto.slug, ...g })), cliente: dadosCliente, frete }),
      })
      const dados = await resposta.json()
      if (!resposta.ok) {
        aba?.close()
        mostrarErro(dados.erros || ['Não foi possível enviar o pedido.'])
        return
      }
      lembrar(dadosCliente)
      if (aba) aba.location.href = dados.whatsappUrl
      else window.location.href = dados.whatsappUrl
    } catch {
      aba?.close()
      mostrarErro('Sem conexão. Verifique sua internet e tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  const adicionarAoCarrinho = () => {
    for (const g of grupos) carrinho.adicionar(produto, g.cor, g.tamanho, g.quantidade)
    setAdicionado(true)
    setEscolhas([])
    setComprandoDireto(false)
  }

  const esgotadoTotal = estoqueTotal === 0

  return (
    <section className="produto" aria-labelledby="produto-nome">
      <div className="produto__imagem">
        <img src={produto.imagem} alt={`${produto.nome} JLK`} loading="eager" fetchPriority="high" />
      </div>

      <div className="produto__info">
        <h1 id="produto-nome" className="produto__nome">
          {produto.nome}
        </h1>
        {produto.descricao && <p className="produto__descricao">{produto.descricao}</p>}

        {/* 1) Preço e quantidade */}
        <div className="produto__compra">
          <div className="produto__linha">
            <div className="produto__preco">
              <span className="produto__preco-rotulo">Preço</span>
              <strong>
                <Preco produto={produto} grande />
              </strong>
            </div>

            <div className="quantidade">
              <span className="produto__preco-rotulo" id="qtd-rotulo">
                Quantidade
              </span>
              <div className="quantidade__controle" role="group" aria-labelledby="qtd-rotulo">
                <button type="button" aria-label="Diminuir quantidade" disabled={quantidade <= 1} onClick={() => mudarQuantidade(quantidade - 1)}>
                  −
                </button>
                <output aria-live="polite">{quantidade}</output>
                <button type="button" aria-label="Aumentar quantidade" disabled={quantidade >= estoqueTotal} onClick={() => mudarQuantidade(quantidade + 1)}>
                  +
                </button>
              </div>
            </div>
          </div>

          {quantidade > 1 && (
            <p className="produto__total">
              Total: <strong>{formatarPreco(produto.preco * quantidade)}</strong>
            </p>
          )}

          {!gradeAberta && (
            <button type="button" className="produto__btn" disabled={esgotadoTotal} onClick={() => setGradeAberta(true)}>
              {esgotadoTotal ? 'Esgotado' : quantidade > 1 ? `Escolher tamanho e cor das ${quantidade} peças` : 'Escolher tamanho e cor'}
            </button>
          )}
        </div>

        {adicionado && (
          <p className="produto__adicionado" role="status">
            ✓ Adicionado ao carrinho. <Link href="/carrinho">Ver carrinho</Link>
          </p>
        )}

        {/* 2) Grade de cor × tamanho (depois de escolher a quantidade) */}
        {gradeAberta && (
          <div className="produto__escolha">
            <h2 className="produto__subtitulo">
              {completo_
                ? quantidade > 1
                  ? `${quantidade} peças escolhidas`
                  : 'Peça escolhida'
                : quantidade > 1
                  ? `Escolha o tamanho e a cor (${escolhas.length + 1} de ${quantidade})`
                  : 'Escolha o tamanho e a cor'}
            </h2>

            {quantidade > 1 && escolhas.length > 0 && !completo_ && (
              <p className="produto__proximo" role="status">
                ✓ Peça {escolhas.length} escolhida. <strong>Escolha o próximo produto</strong> ({escolhas.length + 1} de {quantidade}) — falta{faltam === 1 ? '' : 'm'} {faltam}.
              </p>
            )}

            {/* Cada cor é uma linha; os botões são os tamanhos que ela tem. Riscado = esgotado. */}
            <div className="grade" role="group" aria-label="Cores e tamanhos disponíveis">
              {produto.cores.map((cor) => {
                const tamanhosDaCor = TAMANHOS.filter((t) => situacaoVariacao(produto, cor.nome, t).situacao !== 'nao-possui')
                if (!tamanhosDaCor.length) return null // cor sem nenhum tamanho no cadastro
                const corEsgotada = totalCor(cor.nome) === 0
                return (
                  <div key={cor.nome} className={`grade__linha ${corEsgotada ? 'is-esgotada' : ''}`} role="group" aria-label={`Cor ${cor.nome}`}>
                    <div className="grade__cor">
                      <span className="grade__amostra" style={{ background: cor.hex }} aria-hidden="true" />
                      <span className="grade__cor-nome">{cor.nome}</span>
                      {corEsgotada && <small>Esgotada</small>}
                    </div>
                    <div className="grade__tamanhos">
                      {tamanhosDaCor.map((tam) => {
                        const { situacao, quantidade: q } = situacaoVariacao(produto, cor.nome, tam)
                        const esgotado = situacao === 'esgotado'
                        const baixo = situacao === 'baixo'
                        const escolhidas = escolhidasDe(cor.nome, tam)
                        const semMais = escolhidas >= q // já escolheu todo o estoque deste tamanho
                        const travada = quantidade > 1 && completo_ // todas as peças já escolhidas
                        const descricao = esgotado ? 'esgotado' : `${q} ${q === 1 ? 'disponível' : 'disponíveis'}`
                        return (
                          <button
                            key={tam}
                            type="button"
                            className={`grade__celula ${escolhidas ? 'is-ativo' : ''} ${esgotado ? 'is-esgotado' : ''}`}
                            disabled={esgotado || (quantidade > 1 && (semMais || travada))}
                            aria-pressed={escolhidas > 0}
                            aria-label={`${cor.nome}, tamanho ${tam}: ${descricao}${escolhidas ? `, ${escolhidas} escolhida${escolhidas > 1 ? 's' : ''}` : ''}`}
                            onClick={() => escolher(cor.nome, tam)}
                          >
                            <span className="grade__tam">{tam}</span>
                            {baixo && <span className="grade__aviso">{q === 1 ? 'Resta 1' : `Restam ${q}`}</span>}
                            {escolhidas > 0 && quantidade > 1 && <span className="grade__escolhidas">×{escolhidas}</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {escolhas.length > 0 && (
              <ul className="produto__escolhas" aria-label="Peças escolhidas">
                {escolhas.map((e, i) => (
                  <li key={`${e.cor}-${e.tamanho}-${i}`}>
                    <span>
                      {quantidade > 1 && <b>{i + 1}.</b>} {e.cor} · {e.tamanho}
                    </span>
                    <button type="button" onClick={() => removerEscolha(i)} aria-label={`Remover peça ${i + 1}: ${e.cor} ${e.tamanho}`}>
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* 3) Comprar */}
            <div className="produto__acoes">
              <button type="button" className="produto__btn" disabled={!completo_} onClick={adicionarAoCarrinho}>
                {completo_ ? 'Adicionar ao carrinho' : quantidade > 1 ? `Escolha mais ${faltam} peça${faltam === 1 ? '' : 's'}` : 'Selecione cor e tamanho'}
              </button>

              {completo_ && !comprandoDireto && (
                <button type="button" className="produto__btn produto__btn--whats" onClick={() => setComprandoDireto(true)}>
                  <IconeWhatsApp className="produto__whats-icone" />
                  Comprar direto pelo WhatsApp
                </button>
              )}
              {completo_ && comprandoDireto && (
                <div className="produto__direto">
                  <FormaEnvio valor={frete} aoMudar={setFrete} idBase="produto-envio" />
                  <DadosCliente
                    cliente={cliente}
                    setCliente={setCliente}
                    idBase="produto-cliente"
                    itensFrete={produto.calculaFrete && frete !== RETIRAR ? [{ slug: produto.slug, quantidade: escolhas.length || quantidade }] : []}
                  />
                  <button type="button" className="produto__btn produto__btn--whats" onClick={comprarDireto} disabled={!completo || enviando}>
                    <IconeWhatsApp className="produto__whats-icone" />
                    {enviando ? 'Conferindo pedido…' : 'Enviar pedido pelo WhatsApp'}
                  </button>
                  {!completo && <p className="produto__aviso">Preencha os dados para entrega para enviar pelo WhatsApp.</p>}
                </div>
              )}
              {completo_ && <p className="produto__aviso">Adicione ao carrinho para comprar outros produtos, ou compre só estas peças direto pelo WhatsApp.</p>}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
