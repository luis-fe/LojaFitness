import { useState } from 'react'
import './Produto.css'
import { TAMANHOS, ESTOQUE_BAIXO, buscarProduto, formatarPreco } from '../data/produtos.js'

export default function Produto({ slug }) {
  const produto = buscarProduto(slug)
  const [selecao, setSelecao] = useState(null) // { cor, tamanho }

  if (!produto) {
    return (
      <section className="produto produto--vazio">
        <h1>Produto não encontrado</h1>
        <a href="#novidades" className="produto__btn">Ver novidades</a>
      </section>
    )
  }

  const qtd = (cor, tam) => produto.estoque[cor]?.[tam] ?? 0
  const totalCor = (cor) => TAMANHOS.reduce((s, t) => s + qtd(cor, t), 0)
  const qtdSelecionada = selecao ? qtd(selecao.cor, selecao.tamanho) : 0

  return (
    <section className="produto" aria-labelledby="produto-nome">
      <div className="produto__imagem">
        <img src={produto.imagem} alt={`${produto.nome} JLK`} width="900" height="900" />
      </div>

      <div className="produto__info">
        <nav className="produto__breadcrumb" aria-label="Você está em">
          <a href="#">Início</a>
          <span aria-hidden="true">/</span>
          <a href="#novidades">Novidades</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{produto.nome}</span>
        </nav>

        <h1 id="produto-nome" className="produto__nome">{produto.nome}</h1>
        <p className="produto__descricao">{produto.descricao}</p>

        <h2 className="produto__subtitulo">Escolha a cor e o tamanho</h2>

        <div className="grade" role="region" aria-label="Cores, tamanhos e estoque" tabIndex={0}>
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
                      <small>{totalCor(cor.nome)} un.</small>
                    </span>
                  </th>
                  {TAMANHOS.map((tam) => {
                    const q = qtd(cor.nome, tam)
                    const esgotado = q === 0
                    const baixo = q > 0 && q <= ESTOQUE_BAIXO
                    const ativo = selecao?.cor === cor.nome && selecao?.tamanho === tam
                    return (
                      <td key={tam}>
                        <button
                          type="button"
                          className={`grade__celula ${ativo ? 'is-ativo' : ''} ${baixo ? 'is-baixo' : ''}`}
                          disabled={esgotado}
                          aria-pressed={ativo}
                          aria-label={`${cor.nome}, tamanho ${tam}: ${esgotado ? 'esgotado' : `${q} em estoque`}`}
                          onClick={() => setSelecao({ cor: cor.nome, tamanho: tam })}
                        >
                          <span className="grade__qtd">{esgotado ? '—' : q}</span>
                          <span className="grade__rotulo">
                            {esgotado ? 'Esgotado' : baixo ? 'Últimas' : 'un.'}
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
          <div className="produto__preco">
            <span className="produto__preco-rotulo">Preço</span>
            <strong>{formatarPreco(produto.preco)}</strong>
          </div>
          <button type="button" className="produto__btn" disabled={!selecao}>
            {selecao ? 'Comprar' : 'Selecione cor e tamanho'}
          </button>
        </div>
      </div>
    </section>
  )
}
