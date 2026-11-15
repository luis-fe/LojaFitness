import './Hero.css'
import imagem from '../assets/hero-conjunto.jpg'

export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-titulo">
      <div className="hero__imagem">
        <img
          src={imagem}
          alt="Modelo vestindo conjunto fitness preto com top e legging JLK"
          width="1078"
          height="1351"
          fetchpriority="high"
        />
      </div>

      <div className="hero__conteudo">
        <span className="hero__selo">Black Friday</span>
        <h1 id="hero-titulo" className="hero__titulo">
          <span className="hero__linha">Conforto para treinar.</span>{' '}
          <span className="hero__linha">Estilo para o dia a dia.</span>
        </h1>
        <p className="hero__texto">
          Conjuntos fitness que valorizam o seu corpo com preços especiais de Black Friday.
        </p>
        <div className="hero__acoes">
          <a href="#novidades" className="hero__btn hero__btn--principal">
            Comprar agora
          </a>
          <a href="#black-friday" className="hero__btn hero__btn--secundario">
            Ver ofertas
          </a>
        </div>
      </div>
    </section>
  )
}
