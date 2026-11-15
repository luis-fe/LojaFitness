import Link from 'next/link'

export default function EmConstrucao({ titulo }) {
  return (
    <section style={{ maxWidth: 720, margin: '0 auto', padding: '48px 16px' }}>
      <p style={{ fontSize: 13, color: 'var(--cinza-texto)', marginBottom: 16 }}>
        <Link href="/area-do-vendedor" style={{ color: 'inherit' }}>
          ← Área do Vendedor
        </Link>
      </p>
      <h1 style={{ fontSize: 28, textTransform: 'uppercase', marginBottom: 8 }}>{titulo}</h1>
      <p style={{ color: 'var(--cinza-texto)' }}>Esta tela está em construção.</p>
    </section>
  )
}
