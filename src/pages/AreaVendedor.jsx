import './AreaVendedor.css'

const topicos = [
  {
    titulo: 'Carregar imagens',
    descricao: 'Envie as fotos dos seus produtos.',
    href: '#area-do-vendedor/carregar-imagens',
  },
  {
    titulo: 'Cadastrar Campanhas',
    descricao: 'Crie promoções e campanhas para a loja.',
    href: '#area-do-vendedor/cadastrar-campanhas',
  },
]

export default function AreaVendedor() {
  return (
    <section className="vendedor">
      <h1 className="vendedor__titulo">Área do Vendedor</h1>

      <div className="vendedor__topicos">
        {topicos.map((t) => (
          <a key={t.titulo} href={t.href} className="vendedor__card">
            <h2>{t.titulo}</h2>
            <p>{t.descricao}</p>
          </a>
        ))}
      </div>
    </section>
  )
}
