import './Blocos.css'
import Acao from './Acao'
import AnuncioProduto from './AnuncioProduto'

function Foto({ img }) {
  const conteudo = (
    <figure className="cascata__item">
      <img src={img.url} alt={img.alt || img.legenda || ''} loading="lazy" />
      {img.legenda && <figcaption>{img.legenda}</figcaption>}
    </figure>
  )
  return img.link ? (
    <Acao href={img.link} className="bloco-link">
      {conteudo}
    </Acao>
  ) : (
    conteudo
  )
}

// "Cascata de imagens": anúncios de produtos em colunas com alturas diferentes (mural)
//   catalogo: { [slug]: produto } — produto oculto/excluído some do site
export default function BlocoCascata({ dados, id, catalogo }) {
  const { titulo, subtitulo, colunas } = dados
  const imagens = dados.imagens.filter((img) => !img.produto || catalogo?.[img.produto])
  return (
    <section className="bloco" aria-labelledby={titulo ? `titulo-${id}` : undefined} aria-label={titulo ? undefined : 'Galeria de imagens'}>
      {(titulo || subtitulo) && (
        <header className="bloco__cabecalho">
          {titulo && <h2 id={`titulo-${id}`}>{titulo}</h2>}
          {subtitulo && <p>{subtitulo}</p>}
        </header>
      )}
      {imagens.length ? (
        <div className="cascata" style={{ '--colunas': colunas }}>
          {imagens.map((img, i) =>
            img.produto ? (
              <div key={`${img.produto}-${i}`} className="cascata__item">
                <AnuncioProduto produto={catalogo[img.produto]} classeFoto="anuncio__foto anuncio__foto--livre" />
              </div>
            ) : (
              <Foto key={`${img.url}-${i}`} img={img} />
            )
          )}
        </div>
      ) : (
        <div className="bloco-sem-imagem bloco-sem-imagem--faixa">Adicione produtos a esta camada</div>
      )}
    </section>
  )
}
