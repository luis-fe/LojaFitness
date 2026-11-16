'use client'

import PaginaVendedor from '@/components/PaginaVendedor'
import CardsMenu from '@/components/CardsMenu'
import { IconeTamanhos, IconeCores, IconeCaixa, IconeEntrada, IconeInventario } from '@/components/Icones'

export default function MenuProdutos() {
  return (
    <PaginaVendedor titulo="Produtos" largura={1080}>
      <CardsMenu
        rotulo="Opções de produtos"
        itens={[
          { titulo: 'Tamanhos', href: '/area-do-vendedor/tamanhos', Icone: IconeTamanhos, cor: 'dourado' },
          { titulo: 'Cores', href: '/area-do-vendedor/cores', Icone: IconeCores, cor: 'dourado' },
          { titulo: 'Produtos', href: '/area-do-vendedor/cadastro-produtos', Icone: IconeCaixa, cor: 'dourado' },
          { titulo: 'Entradas', href: '/area-do-vendedor/entradas', Icone: IconeEntrada, cor: 'dourado' },
          { titulo: 'Inventário', href: '/area-do-vendedor/inventario', Icone: IconeInventario, cor: 'dourado' },
        ]}
      />
    </PaginaVendedor>
  )
}
