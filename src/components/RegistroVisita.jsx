'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Avisa o servidor que alguém está visitando a loja (uma vez por sessão do navegador).
// Não conta a Área do Vendedor nem a prévia do construtor. O servidor ainda evita
// repetir o mesmo IP em 30 minutos e ignora robôs.
export default function RegistroVisita() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname.startsWith('/area-do-vendedor') || pathname.startsWith('/previa-layout')) return
    try {
      if (sessionStorage.getItem('jlk-visita')) return
      sessionStorage.setItem('jlk-visita', '1')
    } catch {
      /* sem armazenamento: registra mesmo assim (o servidor evita duplicar) */
    }
    if (navigator.sendBeacon) navigator.sendBeacon('/api/visitas')
    else fetch('/api/visitas', { method: 'POST', keepalive: true }).catch(() => {})
  }, [pathname])

  return null
}
