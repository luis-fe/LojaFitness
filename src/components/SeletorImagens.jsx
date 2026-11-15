'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import './SeletorImagens.css'
import { useAutenticacao } from '@/context/Autenticacao'
import { IMAGENS_PADRAO } from '@/lib/layoutModelos'

// Seletor de imagens (enviadas em "Subir imagens" + imagens padrão do site). Usar dentro de <Modal>.
//   multiplo: escolher várias (com limite) · aoEscolher([{ url, alt, codigo }])
export default function SeletorImagens({ multiplo, limite, aoEscolher, aoCancelar }) {
  const { api } = useAutenticacao()
  const [aba, setAba] = useState('enviadas')
  const [busca, setBusca] = useState('')
  const [enviadas, setEnviadas] = useState(null)
  const [escolhidas, setEscolhidas] = useState([])

  useEffect(() => {
    const id = setTimeout(async () => {
      const params = new URLSearchParams({ porPagina: '60' })
      if (busca.trim()) params.set('busca', busca.trim())
      const { ok, dados } = await api(`/api/imagens?${params}`)
      setEnviadas(ok ? dados.imagens : [])
    }, 250)
    return () => clearTimeout(id)
  }, [api, busca])

  const lista =
    aba === 'enviadas'
      ? enviadas ?? []
      : IMAGENS_PADRAO.filter((i) => !busca || `${i.codigo} ${i.descricao}`.toLowerCase().includes(busca.toLowerCase()))

  const escolher = (img) => {
    const item = { url: img.url, alt: img.descricao, codigo: img.codigo }
    if (!multiplo) return aoEscolher([item])
    setEscolhidas((atual) =>
      atual.some((i) => i.url === img.url)
        ? atual.filter((i) => i.url !== img.url)
        : atual.length >= limite
          ? atual
          : [...atual, item]
    )
  }

  return (
    <div className="seletor">
      <div className="seletor__topo">
        <div className="segmentado" role="tablist" aria-label="Origem das imagens">
          {[
            ['enviadas', 'Imagens enviadas'],
            ['site', 'Imagens do site'],
          ].map(([v, r]) => (
            <button key={v} type="button" role="tab" aria-selected={aba === v} onClick={() => setAba(v)}>
              {r}
            </button>
          ))}
        </div>
        <div className="campo seletor__busca">
          <label htmlFor="seletor-busca" className="sr-only">
            Buscar imagem
          </label>
          <input id="seletor-busca" type="search" placeholder="Buscar por código ou descrição" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
      </div>

      {aba === 'enviadas' && enviadas === null ? (
        <div className="seletor__vazio" aria-busy="true">
          Carregando…
        </div>
      ) : lista.length === 0 ? (
        <div className="seletor__vazio">
          {aba === 'enviadas' ? (
            <>
              Nenhuma imagem encontrada. <Link href="/area-do-vendedor/carregar-imagens">Enviar imagens</Link>
            </>
          ) : (
            'Nenhuma imagem encontrada.'
          )}
        </div>
      ) : (
        <ul className="seletor__grade">
          {lista.map((img) => {
            const marcada = escolhidas.findIndex((i) => i.url === img.url)
            return (
              <li key={img.url}>
                <button type="button" className={`seletor__item ${marcada >= 0 ? 'is-marcada' : ''}`} onClick={() => escolher(img)} aria-pressed={multiplo ? marcada >= 0 : undefined}>
                  <img src={img.url} alt="" loading="lazy" />
                  <span className="seletor__codigo">{img.codigo}</span>
                  <span className="seletor__descricao">{img.descricao}</span>
                  {marcada >= 0 && <span className="seletor__ordem">{marcada + 1}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {multiplo && (
        <div className="acoes-form">
          <span className="seletor__contagem">
            {escolhidas.length} de até {limite} selecionada{escolhidas.length === 1 ? '' : 's'}
          </span>
          <button type="button" className="botao botao--secundario" onClick={aoCancelar}>
            Cancelar
          </button>
          <button type="button" className="botao" disabled={!escolhidas.length} onClick={() => aoEscolher(escolhidas)}>
            Adicionar
          </button>
        </div>
      )}
    </div>
  )
}

