import './Blocos.css'
import Acao from './Acao'

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

// "Cascata de imagens": fotos em colunas com alturas diferentes (mural)
export default function BlocoCascata({ dados, id }) {
  const { titulo, subtitulo, colunas, imagens } = dados
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
          {imagens.map((img, i) => (
            <Foto key={`${img.url}-${i}`} img={img} />
          ))}
        </div>
      ) : (
        <div className="bloco-sem-imagem bloco-sem-imagem--faixa">Adicione imagens a esta camada</div>
      )}
    </section>
  )
}
