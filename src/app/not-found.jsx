import Link from 'next/link'

export default function NaoEncontrado() {
  return (
    <section style={{ maxWidth: 720, margin: '0 auto', padding: '80px 16px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 28, textTransform: 'uppercase', marginBottom: 8 }}>Página não encontrada</h1>
      <p style={{ color: 'var(--cinza-texto)', marginBottom: 24 }}>
        O endereço pode estar errado ou o produto saiu da loja.
      </p>
      <Link
        href="/#novidades"
        style={{
          display: 'inline-block',
          padding: '16px 32px',
          background: 'var(--preto)',
          color: 'var(--branco)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          textDecoration: 'none',
        }}
      >
        Ver novidades
      </Link>
    </section>
  )
}
