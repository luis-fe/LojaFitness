'use client'

import { useEffect, useState } from 'react'
import RenderizadorLayout from '@/components/blocos/RenderizadorLayout'
import { validarLayout } from '@/lib/layoutModelos'

// Página carregada dentro do construtor (iframe). Recebe o rascunho por postMessage e desenha.
// Só aceita mensagens da própria origem do site.
export default function PreviaLayout() {
  const [camadas, setCamadas] = useState(null)
  const [selecionada, setSelecionada] = useState(null)
  const [produtos, setProdutos] = useState(null)

  // Catálogo para montar os anúncios (preço, cores, tamanhos) na prévia
  useEffect(() => {
    fetch('/api/produtos')
      .then((r) => r.json())
      .then((d) => setProdutos(d.produtos ?? []))
      .catch(() => setProdutos([]))
  }, [])

  useEffect(() => {
    const aoReceber = (e) => {
      if (e.origin !== window.location.origin || e.data?.tipo !== 'jlk-layout') return
      // Valida também aqui: a prévia nunca desenha algo que o servidor recusaria
      const v = validarLayout(e.data.camadas)
      setCamadas(v.ok ? v.camadas : e.data.camadas.filter((c) => c && c.dados))
      setSelecionada(e.data.selecionada ?? null)
    }
    window.addEventListener('message', aoReceber)
    window.parent?.postMessage({ tipo: 'jlk-previa-pronta' }, window.location.origin)
    return () => window.removeEventListener('message', aoReceber)
  }, [])

  // Rola até a camada selecionada
  useEffect(() => {
    if (!selecionada) return
    document.querySelector(`[data-camada="${CSS.escape(selecionada)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selecionada])

  if (!camadas || !produtos) return <div style={{ minHeight: '60vh' }} aria-busy="true" />

  if (!camadas.some((c) => c.visivel)) {
    return (
      <div style={{ padding: '80px 16px', textAlign: 'center', color: 'var(--cinza-texto)' }}>
        Nenhuma camada visível. Adicione ou mostre uma camada no construtor.
      </div>
    )
  }

  return (
    <>
      <style>{`
        header.header { pointer-events: none; }
        .camada-previa { position: relative; cursor: pointer; }
        .camada-previa::after { content: ''; position: absolute; inset: 0; pointer-events: none; transition: box-shadow .15s; }
        .camada-previa:hover::after { box-shadow: inset 0 0 0 2px rgba(37, 99, 235, .5); }
        .camada-previa.is-selecionada::after { box-shadow: inset 0 0 0 3px #2563eb; }
      `}</style>
      <RenderizadorLayout
        camadas={camadas}
        produtos={produtos}
        destacada={selecionada}
        aoClicarCamada={(id) => window.parent?.postMessage({ tipo: 'jlk-previa-clique', id }, window.location.origin)}
      />
    </>
  )
}
