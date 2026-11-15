import Link from 'next/link'
import './CardsMenu.css'
import { IconeCadeado, IconeSeta } from '@/components/Icones'

// Menu em cards grandes.
//   itens: [{ titulo, descricao, href, Icone, bloqueado?, motivo?, selo? }]
//   bloqueado = mostra o card apagado, com cadeado e o motivo (ex.: "Somente administradores")
export default function CardsMenu({ itens, rotulo }) {
  return (
    <ul className="cards-menu" aria-label={rotulo}>
      {itens.map(({ titulo, descricao, href, Icone, bloqueado, motivo, selo }) => (
        <li key={titulo}>
          {bloqueado ? (
            <div className="card-menu is-bloqueado" aria-disabled="true">
              <span className="card-menu__icone">
                <Icone />
              </span>
              <span className="card-menu__titulo">{titulo}</span>
              <span className="card-menu__descricao">{descricao}</span>
              <span className="card-menu__motivo">
                <IconeCadeado /> {motivo || 'Indisponível'}
              </span>
            </div>
          ) : (
            <Link href={href} className="card-menu">
              <span className="card-menu__icone">
                <Icone />
              </span>
              {selo && <span className="card-menu__selo">{selo}</span>}
              <span className="card-menu__titulo">{titulo}</span>
              <span className="card-menu__descricao">{descricao}</span>
              <span className="card-menu__ir">
                Abrir <IconeSeta />
              </span>
            </Link>
          )}
        </li>
      ))}
    </ul>
  )
}
