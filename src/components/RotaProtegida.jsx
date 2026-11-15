'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAutenticacao } from '@/context/Autenticacao'

// Mostra o conteúdo só para quem fez login; os outros vão para a tela de login.
// (A segurança de verdade está nas APIs, que exigem o token Bearer.)
export default function RotaProtegida({ children }) {
  const { carregado, autenticado } = useAutenticacao()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (carregado && !autenticado) {
      router.replace(`/area-do-vendedor/login?voltar=${encodeURIComponent(pathname)}`)
    }
  }, [carregado, autenticado, pathname, router])

  if (!carregado || !autenticado) {
    return <section style={{ minHeight: '60vh' }} aria-busy="true" aria-label="Verificando acesso" />
  }
  return children
}
