import Link from 'next/link'
import Preco from '@/components/Preco'

// Resumo das variações do cadastro: cores e tamanhos que têm estoque
export function resumoVariacoes(produto) {
  const comEstoque = (cor, tam) => (produto.estoque?.[cor]?.[tam] ?? 0) > 0
  const cores = produto.cores.filter((c) => produto.tamanhos.some((t) => comEstoque(c.nome, t)))
  const tamanhos = produto.tamanhos.filter((t) => produto.cores.some((c) => comEstoque(c.nome, t)))
  return { cores, tamanhos, esgotado: tamanhos.length === 0 }
}

// Anúncio montado sozinho a partir do cadastro: foto, nome, preço (com preço anterior riscado,
// se ligado), cores e tamanhos disponíveis e link para a página do produto.
export default function AnuncioProduto({ produto, classeFoto = 'anuncio__foto' }) {
  const { cores, tamanhos, esgotado } = resumoVariacoes(produto)
  return (
    <Link href={`/produto/${produto.slug}`} className={`anuncio ${esgotado ? 'is-esgotado' : ''}`}>
      <div className={classeFoto}>
        <img src={produto.imagem} alt={`${produto.nome} JLK`} loading="lazy" />
        {esgotado && <span className="anuncio__selo">Esgotado</span>}
        {!esgotado && produto.precoAnterior && <span className="anuncio__selo anuncio__selo--oferta">Oferta</span>}
      </div>
      <div className="anuncio__info">
        <strong className="anuncio__nome">{produto.nome}</strong>
        <span className="anuncio__preco">
          <Preco produto={produto} />
        </span>
        {!esgotado && (
          <span className="anuncio__variacoes">
            <span className="anuncio__cores" aria-label={`Cores: ${cores.map((c) => c.nome).join(', ')}`}>
              {cores.map((c) => (
                <span key={c.codigo} className="anuncio__cor" style={{ background: c.hex }} title={c.nome} />
              ))}
            </span>
            <span className="anuncio__tamanhos">{tamanhos.join(' · ')}</span>
          </span>
        )}
      </div>
    </Link>
  )
}
