'use client'

import PaginaVendedor from '@/components/PaginaVendedor'
import CardsMenu from '@/components/CardsMenu'
import { IconeTamanhos, IconeCores, IconeCaixa, IconeSubir } from '@/components/Icones'

export default function MenuProdutos() {
  return (
    <PaginaVendedor titulo="Produtos" largura={1080}>
      <CardsMenu
        rotulo="Opções de produtos"
        itens={[
          { titulo: 'Tamanhos', href: '/area-do-vendedor/tamanhos', Icone: IconeTamanhos },
          { titulo: 'Cores', href: '/area-do-vendedor/cores', Icone: IconeCores },
          { titulo: 'Produtos', href: '/area-do-vendedor/cadastro-produtos', Icone: IconeCaixa },
          { titulo: 'Subir imagens', href: '/area-do-vendedor/carregar-imagens', Icone: IconeSubir },
        ]}
      />
    </PaginaVendedor>
  )
}
