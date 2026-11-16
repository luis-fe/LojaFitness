'use client'

import PaginaVendedor from '@/components/PaginaVendedor'
import CardsMenu from '@/components/CardsMenu'
import { IconeAprovar } from '@/components/Icones'

// Registro de Vendas — submenu
export default function RegistroVendas() {
  return (
    <PaginaVendedor titulo="Registro de Vendas" largura={960}>
      <CardsMenu
        rotulo="Opções de registro de vendas"
        itens={[{ titulo: 'Aprovar Pagamento', href: '/area-do-vendedor/aprovar-pagamento', Icone: IconeAprovar, cor: 'verde' }]}
      />
    </PaginaVendedor>
  )
}
