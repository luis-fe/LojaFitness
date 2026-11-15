import './globals.css'
import Header from '@/components/Header'
import { CarrinhoProvider } from '@/context/Carrinho'
import { NOME_LOJA } from '@/lib/config'

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: NOME_LOJA,
    template: `%s | ${NOME_LOJA}`,
  },
  description:
    'Moda fitness e casual: conjuntos com conforto para treinar e estilo para o dia a dia. Compre pelo WhatsApp.',
}

export const viewport = {
  themeColor: '#000000',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body>
        <CarrinhoProvider>
          <a href="#conteudo" className="pular-conteudo">
            Pular para o conteúdo
          </a>
          <Header />
          <main id="conteudo" tabIndex={-1} style={{ outline: 'none' }}>
            {children}
          </main>
        </CarrinhoProvider>
      </body>
    </html>
  )
}
