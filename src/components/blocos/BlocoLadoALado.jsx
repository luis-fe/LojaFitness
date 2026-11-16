import './Blocos.css'
import Acao from './Acao'
import AnuncioProduto from './AnuncioProduto'

// "Imagens lado a lado": 2 a 4 anúncios de produtos do mesmo tamanho na mesma linha
export default function BlocoLadoALado({ dados, id, catalogo }) {
  const { titulo, subtitulo, proporcao } = dados
  const imagens = dados.imagens.filter((img) => !img.produto || catalogo?.[img.produto])
  return (
    <section className="bloco" aria-labelledby={titulo ? `titulo-${id}` : undefined} aria-label={titulo ? undefined : 'Imagens'}>
      {(titulo || subtitulo) && (
        <header className="bloco__cabecalho">
          {titulo && <h2 id={`titulo-${id}`}>{titulo}</h2>}
          {subtitulo && <p>{subtitulo}</p>}
        </header>
      )}
      {imagens.length ? (
        <div className={`lado-a-lado lado-a-lado--${proporcao}`} style={{ '--quantidade': imagens.length }}>
          {imagens.map((img, i) => {
            if (img.produto) {
              return (
                <div key={`${img.produto}-${i}`} className="lado-a-lado__item">
                  <AnuncioProduto produto={catalogo[img.produto]} classeFoto="anuncio__foto lado-a-lado__foto" />
                </div>
              )
            }
            const conteudo = (
              <figure className="lado-a-lado__item">
                <div className="lado-a-lado__foto">
                  <img src={img.url} alt={img.alt || img.legenda || ''} loading="lazy" />
                </div>
                {img.legenda && <figcaption>{img.legenda}</figcaption>}
              </figure>
            )
            return img.link ? (
              <Acao key={`${img.url}-${i}`} href={img.link} className="bloco-link">
                {conteudo}
              </Acao>
            ) : (
              <div key={`${img.url}-${i}`}>{conteudo}</div>
            )
          })}
        </div>
      ) : (
        <div className="bloco-sem-imagem bloco-sem-imagem--faixa">Adicione de 2 a 4 produtos a esta camada</div>
      )}
    </section>
  )
}
