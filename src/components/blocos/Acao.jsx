import Link from 'next/link'

// Link que usa a navegação do Next para páginas do site e <a> comum para endereços externos
export default function Acao({ href, className, children }) {
  if (!href) return null
  if (href.startsWith('/') || href.startsWith('#')) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}
