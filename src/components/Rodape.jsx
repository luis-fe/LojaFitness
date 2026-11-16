import Link from 'next/link'
import './Rodape.css'
import { NOME_LOJA, CNPJ_LOJA } from '@/lib/config'

export default function Rodape() {
  return (
    <footer className="rodape">
      <nav aria-label="Rodapé" className="rodape__links">
        <Link href="/politica-de-privacidade">Política de Privacidade</Link>
      </nav>
      <p className="rodape__direitos">
        © {new Date().getFullYear()} {NOME_LOJA}
        {CNPJ_LOJA && ` · CNPJ ${CNPJ_LOJA}`}
      </p>
    </footer>
  )
}
