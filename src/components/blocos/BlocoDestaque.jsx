import '@/components/Hero.css'
import './Blocos.css'
import Acao from './Acao'
import Preco from '@/components/Preco'
import { resumoVariacoes } from './AnuncioProduto'

// "Imagem destacada": imagem grande + selo, título, texto e até 2 botões
//   imagem = { produto } → foto, preço e tamanhos vêm do cadastro (catalogo)
export default function BlocoDestaque({ dados, primeiro = false, id, catalogo }) {
  const { selo, titulo, texto, posicao, botaoTexto, botao2Texto, botao2Link } = dados
  const produto = dados.imagem?.produto ? catalogo?.[dados.imagem.produto] : null
  const imagem = produto ? { url: produto.imagem, alt: `${produto.nome} JLK` } : dados.imagem?.produto ? null : dados.imagem
  const botaoLink = dados.botaoLink || (produto ? `/produto/${produto.slug}` : '')
  const variacoes = produto && resumoVariacoes(produto)
  const Titulo = primeiro ? 'h1' : 'h2'
  const tituloId = `titulo-${id}`
  // Quebra o título em frases para equilibrar as linhas ("Conforto para treinar. Estilo...")
  const frases = (titulo || '').split(/(?<=[.!?])\s+/).filter(Boolean)

  return (
    <section className={`hero ${posicao === 'esquerda' ? 'hero--imagem-esquerda' : ''}`} aria-labelledby={tituloId}>
      <div className="hero__imagem">
        {imagem ? (
          <img
            src={imagem.url}
            alt={imagem.alt || ''}
            className="hero__foto"
            fetchPriority={primeiro ? 'high' : undefined}
            loading={primeiro ? 'eager' : 'lazy'}
          />
        ) : (
          <div className="bloco-sem-imagem">Escolha um produto</div>
        )}
      </div>

      <div className="hero__conteudo">
        {selo && <span className="hero__selo">{selo}</span>}
        <Titulo id={tituloId} className="hero__titulo">
          {frases.map((f, i) => (
            <span key={i} className="hero__linha">
              {f}{' '}
            </span>
          ))}
        </Titulo>
        {texto && <p className="hero__texto">{texto}</p>}
        {produto && (
          <p className="hero__anuncio">
            <span className="hero__anuncio-nome">{produto.nome}</span>
            <span className="hero__anuncio-preco">
              <Preco produto={produto} grande />
            </span>
            {variacoes.esgotado ? <span className="hero__anuncio-tam">Esgotado</span> : <span className="hero__anuncio-tam">Tamanhos {variacoes.tamanhos.join(' · ')}</span>}
          </p>
        )}
        {(botaoTexto || botao2Texto) && (
          <div className="hero__acoes">
            {botaoTexto && (
              <Acao href={botaoLink || '/#novidades'} className="hero__btn hero__btn--principal">
                {botaoTexto}
              </Acao>
            )}
            {botao2Texto && (
              <Acao href={botao2Link || '/'} className="hero__btn hero__btn--secundario">
                {botao2Texto}
              </Acao>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
