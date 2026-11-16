'use client'

import PaginaVendedor from '@/components/PaginaVendedor'
import CardsMenu from '@/components/CardsMenu'
import { IconeTamanhos, IconeCores, IconeCaixa } from '@/components/Icones'

export default function MenuProdutos() {
  return (
    <PaginaVendedor titulo="Produtos" largura={1080}>
      <CardsMenu
        rotulo="Opções de produtos"
        itens={[
          { titulo: 'Tamanhos', href: '/area-do-vendedor/tamanhos', Icone: IconeTamanhos, cor: 'dourado' },
          { titulo: 'Cores', href: '/area-do-vendedor/cores', Icone: IconeCores, cor: 'dourado' },
          { titulo: 'Produtos', href: '/area-do-vendedor/cadastro-produtos', Icone: IconeCaixa, cor: 'dourado' },
        ]}
      />
    </PaginaVendedor>
  )
}
