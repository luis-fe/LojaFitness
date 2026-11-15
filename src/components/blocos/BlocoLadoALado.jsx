import './Blocos.css'
import Acao from './Acao'

// "Imagens lado a lado": 2 a 4 fotos do mesmo tamanho na mesma linha
export default function BlocoLadoALado({ dados, id }) {
  const { titulo, subtitulo, proporcao, imagens } = dados
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
        <div className="bloco-sem-imagem bloco-sem-imagem--faixa">Adicione de 2 a 4 imagens a esta camada</div>
      )}
    </section>
  )
}
