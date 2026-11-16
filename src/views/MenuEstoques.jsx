'use client'

import PaginaVendedor from '@/components/PaginaVendedor'
import CardsMenu from '@/components/CardsMenu'
import { IconeEntrada, IconeInventario } from '@/components/Icones'

export default function MenuEstoques() {
  return (
    <PaginaVendedor titulo="Estoques" largura={1080}>
      <CardsMenu
        rotulo="Opções de estoque"
        itens={[
          { titulo: 'Entradas', href: '/area-do-vendedor/entradas', Icone: IconeEntrada, cor: 'marrom' },
          { titulo: 'Inventário', href: '/area-do-vendedor/inventario', Icone: IconeInventario, cor: 'marrom' },
        ]}
      />
    </PaginaVendedor>
  )
}
