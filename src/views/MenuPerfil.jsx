'use client'

import PaginaVendedor from '@/components/PaginaVendedor'
import CardsMenu from '@/components/CardsMenu'
import { IconeVendedores, IconeEditarPerfil } from '@/components/Icones'
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
            titulo: 'Vendedores',
            href: '/area-do-vendedor/vendedores',
            Icone: IconeVendedores,
            cor: 'azul',
            bloqueado: !ehAdmin,
            motivo: 'Somente administradores',
          },
          {
            titulo: 'Alterar Perfil',
            href: '/area-do-vendedor/perfil/alterar',
            Icone: IconeEditarPerfil,
            cor: 'azul',
          },
        ]}
      />
    </PaginaVendedor>
  )
}
