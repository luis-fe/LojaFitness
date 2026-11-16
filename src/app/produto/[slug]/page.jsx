import { notFound } from 'next/navigation'
import Produto from '@/views/Produto'
import { produtos, buscarProduto } from '@/lib/produtos'

// Gera as páginas de todos os produtos no build (carregam mais rápido e são boas para o Google)
export function generateStaticParams() {
  return produtos.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const produto = buscarProduto(slug)
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
      images: [produto.imagem.src],
    },
  }
}

export default async function PaginaProduto({ params }) {
  const { slug } = await params
  if (!buscarProduto(slug)) notFound()
  return <Produto slug={slug} />
}
