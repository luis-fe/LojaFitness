'use client'

import { useEffect, useState } from 'react'
import './SeletorImagens.css'
import Campo from '@/components/Campo'
import { useAutenticacao } from '@/context/Autenticacao'
import { useErro } from '@/context/Erro'
import { IMAGENS_PADRAO } from '@/lib/layoutModelos'
import { TIPOS_ACEITOS, TAMANHO_MAX, codigoDoNome, descricaoDoNome, mascaraCodigo } from '@/lib/imagens'

// Envio de uma imagem nova direto do seletor (sem sair do cadastro)
function EnvioImagem({ arquivo, aoEnviar, aoCancelar }) {
  const { fetchAutenticado } = useAutenticacao()
  const { mostrarErro } = useErro()
  const [previa] = useState(() => URL.createObjectURL(arquivo))
  const [codigo, setCodigo] = useState(() => codigoDoNome(arquivo.name))
  const [descricao, setDescricao] = useState(() => descricaoDoNome(arquivo.name))
  const [erros, setErros] = useState({})
  const [enviando, setEnviando] = useState(false)

  useEffect(() => () => URL.revokeObjectURL(previa), [previa])

  const enviar = async (e) => {
    e.preventDefault()
    const novos = {}
    if (codigo.length < 2) novos.codigo = 'Informe o código.'
    if (descricao.trim().length < 2) novos.descricao = 'Informe a descrição.'
    setErros(novos)
    if (Object.keys(novos).length) return
    setEnviando(true)
    const dados = new FormData()
    dados.append('arquivo', arquivo)
    dados.append('codigo', codigo)
    dados.append('descricao', descricao.trim())
    try {
      const resposta = await fetchAutenticado('/api/imagens', { method: 'POST', body: dados })
      const corpo = await resposta.json().catch(() => null)
      if (resposta.ok) return aoEnviar(corpo.imagem)
      // erro de um campo (ex.: código repetido) aparece no campo; os demais, no modal de erro
      const campos = corpo?.campos ?? {}
      setErros(campos)
      if (!campos.codigo && !campos.descricao) mostrarErro(campos.arquivo || corpo?.erro || 'Não foi possível enviar a imagem.')
    } catch {
      mostrarErro('Sem conexão com o servidor.')
    }
    setEnviando(false)
  }

  return (
    <form className="seletor__envio" onSubmit={enviar} noValidate aria-label="Enviar nova imagem">
      <img src={previa} alt="Prévia da imagem escolhida" className="seletor__envio-previa" />
      <div className="seletor__envio-campos">
        <Campo rotulo="Código" valor={codigo} aoMudar={setCodigo} mascara={mascaraCodigo} erro={erros.codigo} />
        <Campo rotulo="Descrição" valor={descricao} aoMudar={setDescricao} erro={erros.descricao} maxLength={200} />
        <div className="acoes-form">
          <button type="button" className="botao botao--secundario" onClick={aoCancelar} disabled={enviando}>
            Cancelar
          </button>
          <button type="submit" className="botao" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar e usar'}
          </button>
        </div>
      </div>
    </form>
  )
}

// Seletor de imagens (imagens enviadas + imagens padrão do site), com envio de imagem nova.
//   multiplo: escolher várias (com limite) · aoEscolher([{ url, alt, codigo }])
export default function SeletorImagens({ multiplo, limite, aoEscolher, aoCancelar }) {
  const { api } = useAutenticacao()
  const { mostrarErro } = useErro()
  const [arquivoNovo, setArquivoNovo] = useState(null)
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

  const aoSelecionarArquivo = (e) => {
    const arquivo = e.target.files?.[0]
    e.target.value = '' // permite escolher o mesmo arquivo de novo
    if (!arquivo) return
    if (!TIPOS_ACEITOS.includes(arquivo.type)) return mostrarErro('Formato não aceito. Envie JPG, PNG ou WEBP.')
    if (arquivo.size > TAMANHO_MAX) return mostrarErro('A imagem passa de 5 MB.')
    setArquivoNovo(arquivo)
  }

  const aoEnviar = (img) => {
    setArquivoNovo(null)
    setAba('enviadas')
    setEnviadas((atual) => [img, ...(atual ?? [])])
    escolher(img) // a imagem enviada já fica escolhida
  }

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
        <label className="botao botao--pequeno seletor__enviar">
          + Enviar nova imagem
          <input type="file" accept={TIPOS_ACEITOS.join(',')} onChange={aoSelecionarArquivo} className="sr-only" />
        </label>
      </div>

      {arquivoNovo && <EnvioImagem key={arquivoNovo.name + arquivoNovo.size} arquivo={arquivoNovo} aoEnviar={aoEnviar} aoCancelar={() => setArquivoNovo(null)} />}

      {aba === 'enviadas' && enviadas === null ? (
        <div className="seletor__vazio" aria-busy="true">
          Carregando…
        </div>
      ) : lista.length === 0 ? (
        <div className="seletor__vazio">
          {aba === 'enviadas' ? (
            'Nenhuma imagem encontrada. Use “+ Enviar nova imagem” para adicionar.'
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

