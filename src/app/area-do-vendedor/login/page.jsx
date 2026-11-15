import { Suspense } from 'react'
import Login from '@/views/Login'

export const metadata = { title: 'Entrar — Área do Vendedor', robots: { index: false } }

export default function PaginaLogin() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  )
}
