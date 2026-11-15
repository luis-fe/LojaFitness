import '@/components/Hero.css'
import './Blocos.css'
import Acao from './Acao'

// "Imagem destacada": imagem grande + selo, título, texto e até 2 botões
export default function BlocoDestaque({ dados, primeiro = false, id }) {
  const { selo, titulo, texto, imagem, posicao, botaoTexto, botaoLink, botao2Texto, botao2Link } = dados
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
          <div className="bloco-sem-imagem">Escolha uma imagem</div>
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
