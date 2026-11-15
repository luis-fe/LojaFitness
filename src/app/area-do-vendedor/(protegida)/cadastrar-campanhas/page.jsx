import EmConstrucao from '@/components/EmConstrucao'

export const metadata = { title: 'Cadastrar Campanhas', robots: { index: false } }

export default function Pagina() {
  return <EmConstrucao titulo="Cadastrar Campanhas" voltar={{ href: '/area-do-vendedor/produtos', rotulo: 'Produtos' }} />
}
