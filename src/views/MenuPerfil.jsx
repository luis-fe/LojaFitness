'use client'

import PaginaVendedor from '@/components/PaginaVendedor'
import CardsMenu from '@/components/CardsMenu'
import { IconeNovoVendedor, IconeEditarPerfil } from '@/components/Icones'
import { useAutenticacao } from '@/context/Autenticacao'

export default function MenuPerfil() {
  const { vendedor } = useAutenticacao()
  const ehAdmin = vendedor?.papel === 'admin'
  return (
    <PaginaVendedor titulo="Perfil" descricao="Cadastre vendedores e atualize os seus dados." largura={960}>
      <CardsMenu
        rotulo="Opções de perfil"
        itens={[
          {
            titulo: 'Novo Vendedor',
            descricao: 'Cadastre uma pessoa para acessar a Área do Vendedor e gerencie os vendedores existentes.',
            href: '/area-do-vendedor/vendedores?novo=1',
            Icone: IconeNovoVendedor,
            bloqueado: !ehAdmin,
            motivo: 'Somente administradores',
          },
          {
            titulo: 'Alterar Perfil',
            descricao: 'Atualize nome, telefone, CPF/CNPJ, nome fantasia e troque a sua senha.',
            href: '/area-do-vendedor/perfil/alterar',
            Icone: IconeEditarPerfil,
          },
        ]}
      />
    </PaginaVendedor>
  )
}
