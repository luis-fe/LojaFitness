import { formatarPreco } from '@/lib/produtos'
import './Preco.css'

// Preço do produto na loja. Com "efeito X preço anterior" ativado no cadastro:
//   R$ 199,90 (riscado)  Por R$ 159,90
export default function Preco({ produto, quantidade = 1, grande = false }) {
  const atual = produto.preco * quantidade
  const anterior = produto.precoAnterior ? produto.precoAnterior * quantidade : null
  if (!anterior) return <span className={`preco ${grande ? 'preco--grande' : ''}`}>{formatarPreco(atual)}</span>
  return (
    <span className={`preco preco--promo ${grande ? 'preco--grande' : ''}`}>
      <s className="preco__anterior">
        <span className="sr-only">De </span>
        {formatarPreco(anterior)}
      </s>{' '}
      <span className="preco__por">Por</span> <span className="preco__atual">{formatarPreco(atual)}</span>
    </span>
  )
}
