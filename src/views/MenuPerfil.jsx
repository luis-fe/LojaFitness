'use client'

import PaginaVendedor from '@/components/PaginaVendedor'
import CardsMenu from '@/components/CardsMenu'
import { IconeNovoVendedor, IconeEditarPerfil } from '@/components/Icones'
import { useAutenticacao } from '@/context/Autenticacao'

export default function MenuPerfil() {
  const { vendedor } = useAutenticacao()
  const ehAdmin = vendedor?.papel === 'admin'
  return (
    <PaginaVendedor titulo="Perfil" largura={960}>
      <CardsMenu
        rotulo="Opções de perfil"
        itens={[
          {
            titulo: 'Novo Vendedor',
            href: '/area-do-vendedor/vendedores?novo=1',
            Icone: IconeNovoVendedor,
            bloqueado: !ehAdmin,
            motivo: 'Somente administradores',
          },
          {
            titulo: 'Alterar Perfil',
            href: '/area-do-vendedor/perfil/alterar',
            Icone: IconeEditarPerfil,
          },
        ]}
      />
    </PaginaVendedor>
  )
}
