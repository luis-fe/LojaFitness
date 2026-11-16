import BlocoDestaque from './BlocoDestaque'
import BlocoCascata from './BlocoCascata'
import BlocoLadoALado from './BlocoLadoALado'
import Carrossel from '@/components/Carrossel'

// Desenha as camadas do layout, na ordem. Usado na página inicial e na prévia do construtor.
//   destacada → id da camada selecionada no construtor (ganha um contorno na prévia)
//   produtos → catálogo (vitrine e anúncios das imagens de produtos)
export default function RenderizadorLayout({ camadas, produtos, destacada, aoClicarCamada }) {
  const visiveis = camadas.filter((c) => c.visivel)
  const catalogo = produtos ? Object.fromEntries(produtos.map((p) => [p.slug, p])) : null
  const primeiroDestaque = visiveis.find((c) => c.tipo === 'destaque')?.id
  let vitrineUsada = false

  return visiveis.map((camada) => {
    let bloco
    switch (camada.tipo) {
      case 'destaque':
        bloco = <BlocoDestaque dados={camada.dados} id={camada.id} primeiro={camada.id === primeiroDestaque} catalogo={catalogo} />
        break
      case 'cascata':
        bloco = <BlocoCascata dados={camada.dados} id={camada.id} catalogo={catalogo} />
        break
      case 'lado-a-lado':
        bloco = <BlocoLadoALado dados={camada.dados} id={camada.id} catalogo={catalogo} />
        break
      case 'produtos':
        // A primeira vitrine recebe a âncora #novidades (usada pelos botões "Comprar agora")
        {
          // Só os produtos escolhidos na camada, na ordem escolhida (nenhum escolhido = todos à venda)
          const escolhidos = (camada.dados.imagens ?? []).map((i) => catalogo?.[i.produto]).filter(Boolean)
          bloco = <Carrossel key={escolhidos.map((p) => p.slug).join()} produtos={escolhidos.length ? escolhidos : produtos} selo={camada.dados.selo} titulo={camada.dados.titulo} ancora={!vitrineUsada} />
        }
        vitrineUsada = true
        break
      default:
        return null
    }

    if (destacada === undefined) return <div key={camada.id}>{bloco}</div>

    // Modo prévia: cada camada pode ser clicada e a selecionada ganha contorno
    return (
      <div
        key={camada.id}
        data-camada={camada.id}
        className={`camada-previa ${destacada === camada.id ? 'is-selecionada' : ''}`}
        onClickCapture={(e) => {
          e.preventDefault()
          e.stopPropagation()
          aoClicarCamada?.(camada.id)
        }}
      >
        {bloco}
      </div>
    )
  })
}
