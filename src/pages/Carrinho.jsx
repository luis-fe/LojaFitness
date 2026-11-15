import './Carrinho.css'
import { useCarrinho, estoqueDe } from '../context/Carrinho.jsx'
import { formatarPreco } from '../data/produtos.js'
import { linkWhatsApp, mensagemPedido } from '../utils/whatsapp.js'
import IconeWhatsApp from '../components/IconeWhatsApp.jsx'

export default function Carrinho() {
  const { itens, total, quantidadeTotal, alterarQuantidade, remover } = useCarrinho()

  if (itens.length === 0) {
    return (
      <section className="carrinho carrinho--vazio" aria-labelledby="carrinho-titulo">
        <h1 id="carrinho-titulo" className="carrinho__titulo">Seu carrinho está vazio</h1>
        <p>Veja as novidades e escolha seu próximo conjunto.</p>
        <a href="#novidades" className="carrinho__btn">Ver novidades</a>
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
                <a href={`#produto/${item.slug}`} className="item__imagem">
                  <img src={item.imagem} alt={item.nome} width="120" height="120" />
                </a>

                <div className="item__info">
                  <a href={`#produto/${item.slug}`} className="item__nome">{item.nome}</a>
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

          <a
            className="carrinho__btn carrinho__btn--whats"
            href={linkWhatsApp(mensagemPedido(itens))}
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconeWhatsApp className="carrinho__whats-icone" />
            Finalizar pelo WhatsApp
          </a>
          <p className="resumo__aviso">O pedido completo vai pronto na mensagem.</p>
          <a href="#novidades" className="resumo__continuar">Continuar comprando</a>
        </aside>
      </div>
    </section>
  )
}
