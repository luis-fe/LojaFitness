import Image from 'next/image'
import Link from 'next/link'
import './Hero.css'
import imagem from '@/assets/hero-conjunto.jpg'

export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-titulo">
      <div className="hero__imagem">
        <Image
          src={imagem}
          alt="Modelo vestindo conjunto fitness preto com top e legging JLK"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
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
          <Link href="/#novidades" className="hero__btn hero__btn--principal">
            Comprar agora
          </Link>
          <Link href="/#black-friday" className="hero__btn hero__btn--secundario">
            Ver ofertas
          </Link>
        </div>
      </div>
    </section>
  )
}
