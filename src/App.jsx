import { useEffect, useState } from 'react'
import Header from './components/Header.jsx'
import AreaVendedor from './pages/AreaVendedor.jsx'
import Hero from './components/Hero.jsx'
import Carrossel from './components/Carrossel.jsx'

// Navegação simples pelo "#" da URL (ex.: #area-do-vendedor)
function useHash() {
  const [hash, setHash] = useState(window.location.hash)

  useEffect(() => {
    const atualizar = () => setHash(window.location.hash)
    window.addEventListener('hashchange', atualizar)
    return () => window.removeEventListener('hashchange', atualizar)
  }, [])

  return hash
}

export default function App() {
  const hash = useHash()

  return (
    <>
      <a href="#conteudo" className="pular-conteudo" onClick={(e) => {
        e.preventDefault()
        document.getElementById('conteudo')?.focus()
      }}>
        Pular para o conteúdo
      </a>
      <Header hashAtual={hash} />
      <main id="conteudo" tabIndex={-1} style={{ outline: 'none' }}>
        {hash.startsWith('#area-do-vendedor') ? (
          <AreaVendedor />
        ) : (
          <>
            <Hero />
            <Carrossel />
          </>
        )}
      </main>
    </>
  )
}
