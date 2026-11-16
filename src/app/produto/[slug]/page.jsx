import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import Produto from '@/views/Produto'
import { catalogoServico } from '@/server/container'

// Página do produto: dados, grade (cor × tamanho) e estoque vêm do cadastro (banco) a cada visita
async function carregar(slug) {
  await connection()
  return catalogoServico.buscar(slug)
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const produto = await carregar(slug)
  if (!produto) return {}
  return {
    title: produto.nome,
    description: produto.descricao,
    openGraph: {
      type: 'website',
      locale: 'pt_BR',
      siteName: 'JLK Fitness e Casual',
      title: produto.nome,
      description: produto.descricao,
      images: [produto.imagem],
    },
  }
}

export default async function PaginaProduto({ params }) {
  const { slug } = await params
  const produto = await carregar(slug)
  if (!produto) notFound()
  return <Produto produto={produto} />
}
