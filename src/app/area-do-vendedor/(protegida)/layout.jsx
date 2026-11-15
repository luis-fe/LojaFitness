import RotaProtegida from '@/components/RotaProtegida'

// Todas as páginas dentro de (protegida) exigem login
export default function LayoutProtegido({ children }) {
  return <RotaProtegida>{children}</RotaProtegida>
}
