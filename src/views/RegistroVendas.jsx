'use client'

import PaginaVendedor from '@/components/PaginaVendedor'
import CardsMenu from '@/components/CardsMenu'
import { IconeAprovar, IconeLancamento, IconeHistorico } from '@/components/Icones'

// Registro de Vendas — submenu
export default function RegistroVendas() {
  return (
    <PaginaVendedor titulo="Registro de Vendas" largura={960}>
      <CardsMenu
        rotulo="Opções de registro de vendas"
        itens={[
          { titulo: 'Aprovar Pagamento', href: '/area-do-vendedor/aprovar-pagamento', Icone: IconeAprovar, cor: 'verde' },
          { titulo: 'Lançamento Manual', href: '/area-do-vendedor/lancamento-manual', Icone: IconeLancamento, cor: 'verde' },
          { titulo: 'Histórico de Vendas', href: '/area-do-vendedor/historico-vendas', Icone: IconeHistorico, cor: 'verde' },
        ]}
      />
    </PaginaVendedor>
  )
}
