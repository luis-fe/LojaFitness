import Link from 'next/link'
import './CardsMenu.css'
import { IconeCadeado, IconeSeta } from '@/components/Icones'

// Menu em cards grandes.
//   itens: [{ titulo, href, Icone, bloqueado?, motivo?, selo?, cor? }]
//   cor = 'azul' | 'dourado' | 'roxo' pinta o fundo do ícone do card
//   bloqueado = card apagado com cadeado; o motivo aparece ao passar o mouse e para leitores de tela
export default function CardsMenu({ itens, rotulo }) {
  return (
    <ul className="cards-menu" aria-label={rotulo}>
      {itens.map(({ titulo, href, Icone, bloqueado, motivo, selo, cor }) => (
        <li key={titulo}>
          {bloqueado ? (
            <div className="card-menu is-bloqueado" aria-disabled="true" title={motivo || 'Indisponível'}>
              <span className="card-menu__icone">
                <Icone />
              </span>
              <span className="card-menu__rodape">
                <span className="card-menu__titulo">{titulo}</span>
                <span className="card-menu__ir">
                  <IconeCadeado />
                  <span className="card-menu__motivo">{motivo || 'Indisponível'}</span>
                </span>
              </span>
            </div>
          ) : (
            <Link href={href} className={`card-menu ${cor ? `card-menu--${cor}` : ''}`}>
              <span className="card-menu__icone">
                <Icone />
              </span>
              {selo && <span className="card-menu__selo">{selo}</span>}
              <span className="card-menu__rodape">
                <span className="card-menu__titulo">{titulo}</span>
                <span className="card-menu__ir">
                  <IconeSeta />
                </span>
              </span>
            </Link>
          )}
        </li>
      ))}
    </ul>
  )
}
