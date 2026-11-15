'use client'

import PaginaVendedor from '@/components/PaginaVendedor'
import CardsMenu from '@/components/CardsMenu'
import { IconeImagem, IconeCampanha } from '@/components/Icones'

export default function MenuProdutos() {
  return (
    <PaginaVendedor titulo="Produtos" descricao="Fotos dos produtos e campanhas de desconto." largura={960}>
      <CardsMenu
        rotulo="Opções de produtos"
        itens={[
          {
            titulo: 'Carregar imagens',
            descricao: 'Envie as fotos dos produtos e identifique cada uma com código e descrição.',
            href: '/area-do-vendedor/carregar-imagens',
            Icone: IconeImagem,
          },
          {
            titulo: 'Cadastrar Campanhas',
            descricao: 'Crie promoções, defina descontos e período de validade.',
            href: '/area-do-vendedor/cadastrar-campanhas',
            Icone: IconeCampanha,
            selo: 'Em breve',
          },
        ]}
      />
    </PaginaVendedor>
  )
}
