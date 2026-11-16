import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import Link from 'next/link'
import '@/components/blocos/Blocos.css'
import './Selo.css'
import AnuncioProduto from '@/components/blocos/AnuncioProduto'
import { catalogoServico } from '@/server/container'

// Produtos de um Selo-Campanha (ex.: /selo/black-friday) — item do menu lateral
async function carregar(slug) {
  await connection()
  return catalogoServico.listarPorSelo(slug)
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const produtos = await carregar(slug)
  if (!produtos.length) return {}
  return { title: produtos[0].selo, description: `Produtos ${produtos[0].selo} da JLK Fitness e Casual.` }
}

export default async function PaginaSelo({ params }) {
  const { slug } = await params
  const produtos = await carregar(slug)
  if (!produtos.length) notFound()
  const nome = produtos[0].selo

  return (
    <section className="bloco selo-pagina" aria-labelledby="selo-titulo">
      <nav className="selo-pagina__trilha" aria-label="Você está em">
        <Link href="/">Início</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{nome}</span>
      </nav>
      <header className="bloco__cabecalho">
        <h1 id="selo-titulo">{nome}</h1>
        <p>
          {produtos.length} {produtos.length === 1 ? 'produto' : 'produtos'}
        </p>
      </header>
      <ul className="selo-pagina__grade">
        {produtos.map((p) => (
          <li key={p.slug}>
            <AnuncioProduto produto={p} />
          </li>
        ))}
      </ul>
    </section>
  )
}
