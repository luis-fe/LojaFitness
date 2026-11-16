'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import './CarregarImagens.css'
import PaginaVendedor from '@/components/PaginaVendedor'
import Campo from '@/components/Campo'
import Modal from '@/components/Modal'
import { useAutenticacao } from '@/context/Autenticacao'
import { useErro } from '@/context/Erro'
import { formatarDataHora } from '@/lib/formatos'
import { TIPOS_ACEITOS, TAMANHO_MAX, codigoDoNome, mascaraCodigo } from '@/lib/imagens'

const POR_PAGINA = 24

const formatarTamanho = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

// Envia com XMLHttpRequest para mostrar o progresso (fetch não informa progresso de envio)
function enviarComProgresso({ token, arquivo, codigo, descricao, aoProgresso }) {
  return new Promise((resolve) => {
    const dados = new FormData()
    dados.append('arquivo', arquivo)
    dados.append('codigo', codigo)
    dados.append('descricao', descricao)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/imagens')
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => e.lengthComputable && aoProgresso(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => {
      let corpo = null
      try {
        corpo = JSON.parse(xhr.responseText)
      } catch {
        /* resposta sem JSON */
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, dados: corpo })
    }
    xhr.onerror = () => resolve({ ok: false, status: 0, dados: { erro: 'Sem conexão com o servidor.' } })
    xhr.send(dados)
  })
}

// ---------------------------------------------------------------------------
// Envio
// ---------------------------------------------------------------------------
function AreaEnvio({ aoEnviar }) {
  const { sessao, sair } = useAutenticacao()
  const [fila, setFila] = useState([]) // { id, arquivo, previa, codigo, descricao, estado, progresso, erros }
  const [arrastando, setArrastando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const { mostrarErro } = useErro()
  const entrada = useRef(null)

  // Libera as prévias da memória ao sair
  useEffect(() => () => fila.forEach((f) => URL.revokeObjectURL(f.previa)), []) // eslint-disable-line react-hooks/exhaustive-deps

  const adicionar = (arquivos) => {
    const recusados = []
    const novos = []
    for (const arquivo of arquivos) {
      if (!TIPOS_ACEITOS.includes(arquivo.type)) recusados.push(`${arquivo.name}: formato não aceito`)
      else if (arquivo.size > TAMANHO_MAX) recusados.push(`${arquivo.name}: maior que 5 MB`)
      else
        novos.push({
          id: `${arquivo.name}-${arquivo.size}-${Math.random()}`,
          arquivo,
          previa: URL.createObjectURL(arquivo),
          codigo: codigoDoNome(arquivo.name),
          descricao: '',
          estado: 'pendente',
          progresso: 0,
          erros: {},
        })
    }
    setFila((f) => [...f, ...novos])
    if (recusados.length) mostrarErro([...recusados, 'Aceitos: JPG, PNG ou WEBP até 5 MB.'], { titulo: 'Erro' })
  }

  const atualizar = (id, mudancas) => setFila((f) => f.map((item) => (item.id === id ? { ...item, ...mudancas } : item)))
  const remover = (id) =>
    setFila((f) => {
      const item = f.find((i) => i.id === id)
      if (item) URL.revokeObjectURL(item.previa)
      return f.filter((i) => i.id !== id)
    })

  const pendentes = fila.filter((f) => f.estado !== 'enviado')

  const enviarTodos = async () => {
    // Validação rápida no navegador antes de enviar
    let valido = true
    for (const item of pendentes) {
      const erros = {}
      if (item.codigo.length < 2) erros.codigo = 'Informe o código.'
      if (item.descricao.trim().length < 2) erros.descricao = 'Informe a descrição.'
      if (Object.keys(erros).length) {
        valido = false
        atualizar(item.id, { erros, estado: 'erro' })
      }
    }
    if (!valido) return

    setEnviando(true)
    let enviados = 0
    for (const item of pendentes) {
      atualizar(item.id, { estado: 'enviando', progresso: 0, erros: {} })
      const r = await enviarComProgresso({
        token: sessao.token,
        arquivo: item.arquivo,
        codigo: item.codigo,
        descricao: item.descricao,
        aoProgresso: (p) => atualizar(item.id, { progresso: p }),
      })
      if (r.status === 401) {
        sair()
        return
      }
      if (r.ok) {
        enviados++
        atualizar(item.id, { estado: 'enviado', progresso: 100 })
      } else {
        atualizar(item.id, {
          estado: 'erro',
          erros: r.dados?.campos || { geral: r.dados?.erro || 'Não foi possível enviar.' },
        })
      }
    }
    setEnviando(false)
    if (enviados) {
      aoEnviar(enviados)
      // Tira da lista as que já foram enviadas, depois de um instante
      setTimeout(() => setFila((f) => f.filter((i) => i.estado !== 'enviado')), 1500)
    }
  }

  return (
    <section className="cartao" aria-labelledby="envio-titulo">
      <h2 id="envio-titulo" className="cartao__titulo">
        Enviar imagens
      </h2>
      <p className="cartao__descricao">JPG, PNG ou WEBP, até 5 MB cada. Dê a cada imagem um código único e uma descrição.</p>

      <label
        className={`soltar ${arrastando ? 'is-arrastando' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setArrastando(true)
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault()
          setArrastando(false)
          adicionar([...e.dataTransfer.files])
        }}
      >
        <input
          ref={entrada}
          type="file"
          accept={TIPOS_ACEITOS.join(',')}
          multiple
          className="soltar__input"
          onChange={(e) => {
            adicionar([...e.target.files])
            e.target.value = ''
          }}
        />
        <svg viewBox="0 0 24 24" aria-hidden="true" className="soltar__icone">
          <path d="M12 16V4M7 9l5-5 5 5" />
          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
        <span className="soltar__texto">
          <strong>Arraste as imagens aqui</strong> ou <u>clique para escolher</u>
        </span>
      </label>

      {fila.length > 0 && (
        <>
          <ul className="fila">
            {fila.map((item) => (
              <li key={item.id} className={`fila__item is-${item.estado}`}>
                <img src={item.previa} alt="" className="fila__previa" />
                <div className="fila__campos">
                  <span className="fila__nome">
                    {item.arquivo.name} · {formatarTamanho(item.arquivo.size)}
                  </span>
                  <div className="fila__grade">
                    <Campo
                      rotulo="Código"
                      valor={item.codigo}
                      aoMudar={(v) => atualizar(item.id, { codigo: v, erros: { ...item.erros, codigo: undefined } })}
                      mascara={mascaraCodigo}
                      erro={item.erros.codigo}
                      disabled={item.estado === 'enviando' || item.estado === 'enviado'}
                      placeholder="EX.: CONJ-CALCA-AZUL"
                    />
                    <Campo
                      rotulo="Descrição"
                      valor={item.descricao}
                      aoMudar={(v) => atualizar(item.id, { descricao: v, erros: { ...item.erros, descricao: undefined } })}
                      erro={item.erros.descricao}
                      disabled={item.estado === 'enviando' || item.estado === 'enviado'}
                      placeholder="Ex.: Conjunto calça azul, frente"
                    />
                  </div>
                  {item.erros.arquivo && <span className="campo__erro">{item.erros.arquivo}</span>}
                  {item.erros.geral && <span className="campo__erro">{item.erros.geral}</span>}
                  {item.estado === 'enviando' && (
                    <div className="progresso" role="progressbar" aria-valuenow={item.progresso} aria-valuemin={0} aria-valuemax={100} aria-label={`Enviando ${item.arquivo.name}`}>
                      <span style={{ width: `${item.progresso}%` }} />
                    </div>
                  )}
                  {item.estado === 'enviado' && <span className="fila__ok">✓ Enviada</span>}
                </div>
                {item.estado !== 'enviando' && item.estado !== 'enviado' && (
                  <button type="button" className="fila__remover" onClick={() => remover(item.id)} aria-label={`Remover ${item.arquivo.name} da lista`}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="acoes-form">
            <button type="button" className="botao botao--secundario" onClick={() => entrada.current?.click()} disabled={enviando}>
              Adicionar mais
            </button>
            <button type="button" className="botao" onClick={enviarTodos} disabled={enviando || pendentes.length === 0}>
              {enviando ? 'Enviando…' : `Enviar ${pendentes.length} ${pendentes.length === 1 ? 'imagem' : 'imagens'}`}
            </button>
          </div>
        </>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Editar / excluir
// ---------------------------------------------------------------------------
function FormEditarImagem({ imagem, aoSalvar, aoCancelar }) {
  const { api } = useAutenticacao()
  const [codigo, setCodigo] = useState(imagem.codigo)
  const [descricao, setDescricao] = useState(imagem.descricao)
  const [erros, setErros] = useState({})
  const { mostrarErro } = useErro()
  const [salvando, setSalvando] = useState(false)

  const salvar = async (e) => {
    e.preventDefault()
    const corpo = {}
    if (codigo !== imagem.codigo) corpo.codigo = codigo
    if (descricao !== imagem.descricao) corpo.descricao = descricao
    if (!Object.keys(corpo).length) return aoCancelar()
    setSalvando(true)
    const { ok, dados } = await api(`/api/imagens/${imagem.id}`, { metodo: 'PATCH', corpo })
    setSalvando(false)
    if (ok) return aoSalvar(dados.imagem)
    setErros(dados?.campos || {})
    if (!dados?.campos) mostrarErro(dados?.erro || 'Não foi possível salvar.')
  }

  return (
    <form onSubmit={salvar} noValidate>
      <img src={imagem.url} alt="" className="modal-imagem" />
      <div className="grade-campos">
        <Campo rotulo="Código" valor={codigo} aoMudar={(v) => { setCodigo(v); setErros({}) }} mascara={mascaraCodigo} erro={erros.codigo} />
        <Campo rotulo="Descrição" valor={descricao} aoMudar={(v) => { setDescricao(v); setErros({}) }} erro={erros.descricao} />
      </div>
      <div className="acoes-form">
        <button type="button" className="botao botao--secundario" onClick={aoCancelar}>
          Cancelar
        </button>
        <button type="submit" className="botao" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

function ConfirmarExclusao({ imagem, aoExcluir, aoCancelar }) {
  const { api } = useAutenticacao()
  const [erro, setErro] = useState('')
  const { mostrarErro } = useErro()
  const falhar = (mensagem) => {
    setErro(mensagem)
    mostrarErro(mensagem)
  }
  const [excluindo, setExcluindo] = useState(false)
  const excluir = async () => {
    setExcluindo(true)
    const { ok, dados } = await api(`/api/imagens/${imagem.id}`, { metodo: 'DELETE' })
    setExcluindo(false)
    if (ok) return aoExcluir()
    falhar(dados?.erro || 'Não foi possível excluir.')
  }
  return (
    <>
      <img src={imagem.url} alt="" className="modal-imagem" />
      <p className="modal__texto">
        A imagem <strong>{imagem.codigo}</strong> será apagada definitivamente do servidor. Páginas que usam este endereço vão parar de
        mostrá-la.
      </p>
      <div className="acoes-form">
        <button type="button" className="botao botao--secundario" onClick={aoCancelar}>
          Cancelar
        </button>
        <button type="button" className="botao botao--perigo" onClick={excluir} disabled={excluindo}>
          {excluindo ? 'Excluindo…' : 'Excluir imagem'}
        </button>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------
export default function CarregarImagens() {
  const { api, vendedor } = useAutenticacao()
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [pagina, setPagina] = useState(1)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')
  const { mostrarErro } = useErro()
  const falhar = (mensagem) => {
    setErro(mensagem)
    mostrarErro(mensagem)
  }
  const [aviso, setAviso] = useState('')
  const [modal, setModal] = useState(null) // { tipo: 'editar' | 'excluir', imagem }

  useEffect(() => {
    const id = setTimeout(() => {
      setBuscaAplicada(busca.trim())
      setPagina(1)
    }, 350)
    return () => clearTimeout(id)
  }, [busca])

  const carregar = useCallback(async () => {
    const params = new URLSearchParams({ pagina: String(pagina), porPagina: String(POR_PAGINA) })
    if (buscaAplicada) params.set('busca', buscaAplicada)
    const { ok, dados } = await api(`/api/imagens?${params}`)
    if (ok) {
      setResultado(dados)
      setErro('')
    } else falhar(dados?.erro || 'Não foi possível carregar as imagens.')
  }, [api, pagina, buscaAplicada])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    if (!aviso) return
    const id = setTimeout(() => setAviso(''), 4000)
    return () => clearTimeout(id)
  }, [aviso])

  const copiarLink = async (imagem) => {
    const link = `${window.location.origin}${imagem.url}`
    try {
      await navigator.clipboard.writeText(link)
      setAviso(`Link de ${imagem.codigo} copiado.`)
    } catch {
      window.prompt('Copie o link da imagem:', link)
    }
  }

  const podeAlterar = (img) => vendedor?.papel === 'admin' || img.vendedor_id === vendedor?.id
  const { imagens = [], paginacao } = resultado ?? {}

  return (
    <PaginaVendedor titulo="Subir imagens" descricao="Envie as fotos dos produtos e identifique cada uma com código e descrição." largura={1080} trilha={[{ href: '/area-do-vendedor/produtos', rotulo: 'Produtos' }]}>
      <AreaEnvio
        aoEnviar={(n) => {
          setAviso(n === 1 ? '1 imagem enviada.' : `${n} imagens enviadas.`)
          setPagina(1)
          carregar()
        }}
      />

      <section className="cartao" aria-labelledby="galeria-titulo">
        <div className="galeria__topo">
          <h2 id="galeria-titulo" className="cartao__titulo">
            Imagens salvas {paginacao && <span className="galeria__total">({paginacao.total})</span>}
          </h2>
          <div className="campo galeria__busca">
            <label htmlFor="busca-imagens" className="sr-only">
              Buscar imagens
            </label>
            <input id="busca-imagens" type="search" placeholder="Buscar por código ou descrição" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </div>

        <div aria-live="polite">
          {aviso && (
            <p className="aviso aviso--sucesso" role="status" style={{ marginBottom: 16 }}>
              {aviso}
            </p>
          )}
        </div>

        {!resultado && !erro && <div className="galeria__carregando" aria-busy="true" aria-label="Carregando imagens" />}

        {resultado && imagens.length === 0 && (
          <div className="galeria__vazia">
            {buscaAplicada ? `Nenhuma imagem encontrada para “${buscaAplicada}”.` : 'Nenhuma imagem enviada ainda. Use a área acima para enviar a primeira.'}
          </div>
        )}

        {imagens.length > 0 && (
          <ul className="galeria">
            {imagens.map((img) => (
              <li key={img.id} className="galeria__item">
                <a href={img.url} target="_blank" rel="noopener noreferrer" className="galeria__foto" aria-label={`Abrir ${img.codigo} em tamanho real`}>
                  <img src={img.url} alt={img.descricao} loading="lazy" width={img.largura ?? undefined} height={img.altura ?? undefined} />
                </a>
                <div className="galeria__info">
                  <strong className="galeria__codigo">{img.codigo}</strong>
                  <span className="galeria__descricao">{img.descricao}</span>
                  <span className="galeria__meta">
                    {img.largura && `${img.largura}×${img.altura} · `}
                    {formatarTamanho(img.tamanho_bytes)} · {formatarDataHora(img.criado_em)}
                    {img.vendedor_nome && ` · ${img.vendedor_nome}`}
                  </span>
                </div>
                <div className="galeria__acoes">
                  <button type="button" onClick={() => copiarLink(img)}>
                    Copiar link
                  </button>
                  {podeAlterar(img) && (
                    <>
                      <button type="button" onClick={() => setModal({ tipo: 'editar', imagem: img })}>
                        Editar
                      </button>
                      <button type="button" className="is-perigo" onClick={() => setModal({ tipo: 'excluir', imagem: img })}>
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {paginacao?.totalPaginas > 1 && (
          <nav className="paginacao" aria-label="Páginas">
            <button type="button" className="botao botao--secundario" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
              ‹ Anterior
            </button>
            <span>
              Página {paginacao.pagina} de {paginacao.totalPaginas}
            </span>
            <button type="button" className="botao botao--secundario" disabled={pagina >= paginacao.totalPaginas} onClick={() => setPagina((p) => p + 1)}>
              Próxima ›
            </button>
          </nav>
        )}
      </section>

      <Modal aberto={Boolean(modal)} aoFechar={() => setModal(null)} titulo={modal?.tipo === 'excluir' ? 'Excluir imagem?' : 'Editar imagem'} largura={520}>
        {modal?.tipo === 'editar' && (
          <FormEditarImagem
            key={modal.imagem.id}
            imagem={modal.imagem}
            aoCancelar={() => setModal(null)}
            aoSalvar={() => {
              setModal(null)
              setAviso('Imagem atualizada.')
              carregar()
            }}
          />
        )}
        {modal?.tipo === 'excluir' && (
          <ConfirmarExclusao
            imagem={modal.imagem}
            aoCancelar={() => setModal(null)}
            aoExcluir={() => {
              setModal(null)
              setAviso(`Imagem ${modal.imagem.codigo} excluída.`)
              carregar()
            }}
          />
        )}
      </Modal>
    </PaginaVendedor>
  )
}
