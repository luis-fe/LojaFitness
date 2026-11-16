'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import './ConstrutorLayout.css'
import '@/components/Formulario.css'
import Campo from '@/components/Campo'
import Modal from '@/components/Modal'
import { useAutenticacao } from '@/context/Autenticacao'
import { IconeDesfazer, IconeSalvar, IconePublicar } from '@/components/Icones'
import { useErro } from '@/context/Erro'
import { formatarDataHora } from '@/lib/formatos'
import SeletorImagens from '@/components/SeletorImagens'
import { LAYOUT_PADRAO, MAX_CAMADAS, MAX_IMAGENS_POR_CAMADA, MODELOS, novaCamada, novoId } from '@/lib/layoutModelos'

const clonar = (v) => JSON.parse(JSON.stringify(v))
const comNovosIds = (camadas) => clonar(camadas).map((c) => ({ ...c, id: novoId() }))

// ---------------------------------------------------------------------------
// Ilustrações dos modelos (miniaturas no seletor)
// ---------------------------------------------------------------------------
function IlustracaoModelo({ tipo }) {
  const p = { fill: '#d9d9d9' }
  const e = { fill: '#111' }
  return (
    <svg viewBox="0 0 120 72" className="ilustracao" aria-hidden="true">
      <rect width="120" height="72" fill="#f4f4f4" />
      {tipo === 'destaque' && (
        <>
          <rect x="0" y="0" width="60" height="72" {...e} />
          <rect x="8" y="22" width="36" height="5" fill="#fff" />
          <rect x="8" y="31" width="28" height="5" fill="#fff" />
          <rect x="8" y="44" width="20" height="7" fill="#fff" />
          <rect x="60" y="0" width="60" height="72" {...p} />
        </>
      )}
      {tipo === 'cascata' && (
        <>
          <rect x="8" y="8" width="32" height="34" {...p} />
          <rect x="8" y="46" width="32" height="18" {...p} />
          <rect x="44" y="8" width="32" height="20" {...p} />
          <rect x="44" y="32" width="32" height="32" {...p} />
          <rect x="80" y="8" width="32" height="40" {...p} />
          <rect x="80" y="52" width="32" height="12" {...p} />
        </>
      )}
      {tipo === 'lado-a-lado' && (
        <>
          <rect x="8" y="12" width="32" height="44" {...p} />
          <rect x="44" y="12" width="32" height="44" {...p} />
          <rect x="80" y="12" width="32" height="44" {...p} />
          <rect x="8" y="60" width="20" height="4" {...e} />
          <rect x="44" y="60" width="20" height="4" {...e} />
          <rect x="80" y="60" width="20" height="4" {...e} />
        </>
      )}
      {tipo === 'produtos' && (
        <>
          <rect x="8" y="8" width="30" height="5" {...e} />
          <rect x="8" y="18" width="50" height="40" {...p} />
          <rect x="62" y="18" width="50" height="40" {...p} />
          <rect x="8" y="62" width="24" height="4" {...e} />
          <rect x="62" y="62" width="24" height="4" {...e} />
        </>
      )}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Pequenos controles
// ---------------------------------------------------------------------------
function Segmentado({ rotulo, opcoes, valor, aoMudar }) {
  return (
    <div className="campo">
      <span className="campo__rotulo">{rotulo}</span>
      <div className="segmentado" role="radiogroup" aria-label={rotulo}>
        {opcoes.map(([v, r]) => (
          <button key={v} type="button" role="radio" aria-checked={valor === v} onClick={() => aoMudar(v)}>
            {r}
          </button>
        ))}
      </div>
    </div>
  )
}

function AreaTexto({ rotulo, valor, aoMudar, max }) {
  const id = useMemo(() => `t-${Math.random().toString(36).slice(2)}`, [])
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <textarea id={id} rows={3} maxLength={max} value={valor} onChange={(e) => aoMudar(e.target.value)} />
    </div>
  )
}

// Lista editável de imagens (cascata e lado a lado)
function ListaImagens({ imagens, limite, aoMudar, abrirSeletor }) {
  const mover = (i, d) => {
    const nova = [...imagens]
    ;[nova[i], nova[i + d]] = [nova[i + d], nova[i]]
    aoMudar(nova)
  }
  const atualizar = (i, campo, v) => aoMudar(imagens.map((img, n) => (n === i ? { ...img, [campo]: v } : img)))
  return (
    <div className="lista-imagens">
      <span className="campo__rotulo">
        Imagens ({imagens.length}/{limite})
      </span>
      {imagens.length > 0 && (
        <ol>
          {imagens.map((img, i) => (
            <li key={`${img.url}-${i}`} className="lista-imagens__item">
              <img src={img.url} alt="" />
              <div className="lista-imagens__campos">
                <input aria-label={`Legenda da imagem ${i + 1}`} placeholder="Legenda (opcional)" value={img.legenda ?? ''} maxLength={120} onChange={(e) => atualizar(i, 'legenda', e.target.value)} />
                <input aria-label={`Link da imagem ${i + 1}`} placeholder="Link ao clicar (opcional), ex.: /produto/conjunto-calca" value={img.link ?? ''} maxLength={300} onChange={(e) => atualizar(i, 'link', e.target.value)} />
              </div>
              <div className="lista-imagens__acoes">
                <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Mover imagem ${i + 1} para cima`}>
                  ↑
                </button>
                <button type="button" onClick={() => mover(i, 1)} disabled={i === imagens.length - 1} aria-label={`Mover imagem ${i + 1} para baixo`}>
                  ↓
                </button>
                <button type="button" onClick={() => aoMudar(imagens.filter((_, n) => n !== i))} aria-label={`Remover imagem ${i + 1}`}>
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <button type="button" className="botao botao--secundario botao--pequeno" disabled={imagens.length >= limite} onClick={() => abrirSeletor(limite - imagens.length)}>
        + Adicionar imagens
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editor de cada tipo de camada
// ---------------------------------------------------------------------------
function EditorCamada({ camada, aoMudar, abrirSeletor }) {
  const d = camada.dados
  const set = (campo) => (v) => aoMudar({ ...d, [campo]: v })

  switch (camada.tipo) {
    case 'destaque':
      return (
        <div className="editor">
          <div className="editor__imagem">
            {d.imagem ? <img src={d.imagem.url} alt="" /> : <div className="editor__sem-imagem">Sem imagem</div>}
            <div className="editor__imagem-acoes">
              <button type="button" className="botao botao--secundario botao--pequeno" onClick={() => abrirSeletor(1, (imgs) => set('imagem')({ url: imgs[0].url, alt: imgs[0].alt }))}>
                {d.imagem ? 'Trocar imagem' : 'Escolher imagem'}
              </button>
              {d.imagem && (
                <button type="button" className="link-acao" onClick={() => set('imagem')(null)}>
                  Remover
                </button>
              )}
            </div>
          </div>
          {d.imagem && <Campo rotulo="Descrição da imagem (acessibilidade)" valor={d.imagem.alt} aoMudar={(v) => set('imagem')({ ...d.imagem, alt: v })} maxLength={200} />}
          <Segmentado rotulo="Posição da imagem" valor={d.posicao} aoMudar={set('posicao')} opcoes={[['esquerda', 'Esquerda'], ['direita', 'Direita']]} />
          <Campo rotulo="Selo" opcional valor={d.selo} aoMudar={set('selo')} maxLength={40} dica="Ex.: Black Friday, Lançamento" />
          <Campo rotulo="Título" valor={d.titulo} aoMudar={set('titulo')} maxLength={120} />
          <AreaTexto rotulo="Texto" valor={d.texto} aoMudar={set('texto')} max={300} />
          <div className="editor__duplo">
            <Campo rotulo="Botão principal" opcional valor={d.botaoTexto} aoMudar={set('botaoTexto')} maxLength={40} />
            <Campo rotulo="Link do botão" valor={d.botaoLink} aoMudar={set('botaoLink')} maxLength={300} placeholder="/#novidades" />
          </div>
          <div className="editor__duplo">
            <Campo rotulo="Botão secundário" opcional valor={d.botao2Texto} aoMudar={set('botao2Texto')} maxLength={40} />
            <Campo rotulo="Link do botão" valor={d.botao2Link} aoMudar={set('botao2Link')} maxLength={300} placeholder="/produto/conjunto-calca" />
          </div>
        </div>
      )
    case 'cascata':
      return (
        <div className="editor">
          <Campo rotulo="Título" opcional valor={d.titulo} aoMudar={set('titulo')} maxLength={120} />
          <Campo rotulo="Subtítulo" opcional valor={d.subtitulo} aoMudar={set('subtitulo')} maxLength={200} />
          <Segmentado rotulo="Colunas (computador)" valor={d.colunas} aoMudar={set('colunas')} opcoes={[[2, '2'], [3, '3'], [4, '4']]} />
          <ListaImagens imagens={d.imagens} limite={MAX_IMAGENS_POR_CAMADA} aoMudar={set('imagens')} abrirSeletor={(n) => abrirSeletor(n, (imgs) => set('imagens')([...d.imagens, ...imgs.map((i) => ({ url: i.url, alt: i.alt, legenda: '', link: '' }))]), true)} />
        </div>
      )
    case 'lado-a-lado':
      return (
        <div className="editor">
          <Campo rotulo="Título" opcional valor={d.titulo} aoMudar={set('titulo')} maxLength={120} />
          <Campo rotulo="Subtítulo" opcional valor={d.subtitulo} aoMudar={set('subtitulo')} maxLength={200} />
          <Segmentado rotulo="Formato das fotos" valor={d.proporcao} aoMudar={set('proporcao')} opcoes={[['retrato', 'Retrato'], ['quadrada', 'Quadrada'], ['paisagem', 'Paisagem']]} />
          <ListaImagens imagens={d.imagens} limite={4} aoMudar={set('imagens')} abrirSeletor={(n) => abrirSeletor(n, (imgs) => set('imagens')([...d.imagens, ...imgs.map((i) => ({ url: i.url, alt: i.alt, legenda: '', link: '' }))]), true)} />
        </div>
      )
    case 'produtos':
      return (
        <div className="editor">
          <Campo rotulo="Selo" opcional valor={d.selo} aoMudar={set('selo')} maxLength={40} />
          <Campo rotulo="Título" valor={d.titulo} aoMudar={set('titulo')} maxLength={120} />
          <p className="editor__nota">Os produtos, preços e fotos desta vitrine vêm do catálogo da loja.</p>
        </div>
      )
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------
export default function ConstrutorLayout() {
  const { api, vendedor } = useAutenticacao()
  const { mostrarErro } = useErro()
  const [estado, setEstado] = useState(null) // resposta do GET /api/layout
  const [camadas, setCamadas] = useState([])
  const [selecionada, setSelecionada] = useState(null)
  const [dispositivo, setDispositivo] = useState('computador')
  const [modal, setModal] = useState(null) // { tipo: 'adicionar' | 'imagens' | 'publicar' | 'padrao' | 'descartar', ... }
  const [aviso, setAviso] = useState(null) // { tipo, texto, lista? }
  const [ocupado, setOcupado] = useState(false)
  const quadro = useRef(null)

  const ehAdmin = vendedor?.papel === 'admin'

  const aplicarEstado = useCallback((dados) => {
    setEstado(dados)
    setCamadas(clonar(dados.rascunho))
  }, [])

  useEffect(() => {
    if (!ehAdmin) return
    api('/api/layout').then(({ ok, dados }) => {
      if (ok) aplicarEstado(dados)
      else mostrarErro(dados?.erro || 'Não foi possível carregar o layout.')
    })
  }, [api, ehAdmin, aplicarEstado, mostrarErro])

  const json = JSON.stringify(camadas)
  const alterado = estado && json !== JSON.stringify(estado.rascunho)
  const naoPublicado = estado && json !== JSON.stringify(estado.publicado)

  // Avisa antes de sair com alterações não salvas
  useEffect(() => {
    if (!alterado) return
    const aviso = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [alterado])

  // Comunicação com a prévia (iframe)
  const enviarParaPrevia = useCallback(() => {
    quadro.current?.contentWindow?.postMessage({ tipo: 'jlk-layout', camadas, selecionada }, window.location.origin)
  }, [camadas, selecionada])

  useEffect(() => {
    const id = setTimeout(enviarParaPrevia, 120)
    return () => clearTimeout(id)
  }, [enviarParaPrevia])

  useEffect(() => {
    const aoReceber = (e) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.tipo === 'jlk-previa-pronta') enviarParaPrevia()
      if (e.data?.tipo === 'jlk-previa-clique') {
        setSelecionada(e.data.id)
        document.getElementById(`camada-${e.data.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
    window.addEventListener('message', aoReceber)
    return () => window.removeEventListener('message', aoReceber)
  }, [enviarParaPrevia])

  useEffect(() => {
    if (aviso?.tipo !== 'sucesso') return
    const id = setTimeout(() => setAviso(null), 4000)
    return () => clearTimeout(id)
  }, [aviso])

  // ---------- ações nas camadas ----------
  const atualizarCamada = (id, mudancas) => setCamadas((cs) => cs.map((c) => (c.id === id ? { ...c, ...mudancas } : c)))
  const mover = (i, d) =>
    setCamadas((cs) => {
      const n = [...cs]
      ;[n[i], n[i + d]] = [n[i + d], n[i]]
      return n
    })
  const remover = (id) => {
    setCamadas((cs) => cs.filter((c) => c.id !== id))
    if (selecionada === id) setSelecionada(null)
  }
  const duplicar = (i) =>
    setCamadas((cs) => {
      const copia = { ...clonar(cs[i]), id: novoId() }
      const n = [...cs]
      n.splice(i + 1, 0, copia)
      setSelecionada(copia.id)
      return n
    })
  const adicionar = (tipo) => {
    const c = novaCamada(tipo)
    setCamadas((cs) => [...cs, c])
    setSelecionada(c.id)
    setModal(null)
    setTimeout(() => document.getElementById(`camada-${c.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
  }

  // ---------- salvar / publicar ----------
  const enviar = async (rota, metodo, mensagem) => {
    setOcupado(true)
    setAviso(null)
    const { ok, dados } = await api(rota, { metodo, corpo: { camadas } })
    setOcupado(false)
    setModal(null)
    if (ok) {
      aplicarEstado(dados)
      setAviso({ tipo: 'sucesso', texto: mensagem })
    } else {
      mostrarErro(dados?.campos?.camadas?.length > 1 ? dados.campos.camadas : dados?.erro || 'Não foi possível salvar.')
    }
  }

  if (!ehAdmin) {
    return (
      <section className="construtor construtor--estreito">
        <p className="aviso aviso--erro" role="alert">
          Somente administradores podem alterar o layout do site. <Link href="/area-do-vendedor">Voltar</Link>
        </p>
      </section>
    )
  }

  const atual = camadas.find((c) => c.id === selecionada)

  return (
    <section className="construtor" aria-labelledby="construtor-titulo">
      {/* Barra superior */}
      <header className="construtor__barra">
        <div className="construtor__identificacao">
          <nav className="construtor__trilha" aria-label="Você está em">
            <Link href="/area-do-vendedor">Início</Link> / <span aria-current="page">Meu Site</span>
          </nav>
          <h1 id="construtor-titulo">Construção Layout Site</h1>
        </div>
      </header>

      {aviso && (
        <div className={`aviso aviso--${aviso.tipo} construtor__aviso`} role={aviso.tipo === 'erro' ? 'alert' : 'status'}>
          {aviso.texto}
          {aviso.lista?.length > 1 && (
            <ul>
              {aviso.lista.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="construtor__corpo">
        {/* Painel de camadas */}
        <aside className="painel" aria-label="Camadas da página">
          <div className="painel__topo">
            <h2>Camadas ({camadas.length})</h2>
            <button type="button" className="botao botao--pequeno botao--roxo" disabled={camadas.length >= MAX_CAMADAS} onClick={() => setModal({ tipo: 'adicionar' })}>
              + Nova camada
            </button>
          </div>
          <p className="painel__dica">A ordem aqui é a ordem na página. Clique numa camada para editar.</p>

          {camadas.length === 0 && (
            <div className="painel__vazio">
              A página está vazia.
              <button type="button" className="botao botao--pequeno botao--roxo" onClick={() => setModal({ tipo: 'adicionar' })}>
                + Adicionar a primeira camada
              </button>
            </div>
          )}

          <ol className="camadas">
            {camadas.map((c, i) => {
              const aberta = c.id === selecionada
              const resumo = c.dados.titulo || c.dados.selo || `${c.dados.imagens?.length ?? 0} imagem(ns)`
              return (
                <li key={c.id} id={`camada-${c.id}`} className={`camada ${aberta ? 'is-aberta' : ''} ${c.visivel ? '' : 'is-oculta'}`}>
                  <div className="camada__cabecalho">
                    <button type="button" className="camada__titulo" aria-expanded={aberta} onClick={() => setSelecionada(aberta ? null : c.id)}>
                      <span className="camada__numero">{i + 1}</span>
                      <span className="camada__textos">
                        <strong>{MODELOS[c.tipo].nome}</strong>
                        <span>{resumo}</span>
                      </span>
                    </button>
                    <div className="camada__acoes">
                      <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir camada ${i + 1}`} title="Subir">
                        ↑
                      </button>
                      <button type="button" onClick={() => mover(i, 1)} disabled={i === camadas.length - 1} aria-label={`Descer camada ${i + 1}`} title="Descer">
                        ↓
                      </button>
                      <button type="button" onClick={() => atualizarCamada(c.id, { visivel: !c.visivel })} aria-label={c.visivel ? `Ocultar camada ${i + 1}` : `Mostrar camada ${i + 1}`} title={c.visivel ? 'Ocultar' : 'Mostrar'} aria-pressed={!c.visivel}>
                        {c.visivel ? '👁' : '⊘'}
                      </button>
                      <button type="button" onClick={() => duplicar(i)} disabled={camadas.length >= MAX_CAMADAS} aria-label={`Duplicar camada ${i + 1}`} title="Duplicar">
                        ⧉
                      </button>
                      <button type="button" className="is-perigo" onClick={() => remover(c.id)} aria-label={`Remover camada ${i + 1}`} title="Remover">
                        🗑
                      </button>
                    </div>
                  </div>
                  {aberta && (
                    <EditorCamada
                      camada={c}
                      aoMudar={(dados) => atualizarCamada(c.id, { dados })}
                      abrirSeletor={(limite, aoEscolher, multiplo = false) => setModal({ tipo: 'imagens', limite, aoEscolher, multiplo })}
                    />
                  )}
                </li>
              )
            })}
          </ol>

          <button type="button" className="link-acao painel__padrao" onClick={() => setModal({ tipo: 'padrao' })}>
            Restaurar layout padrão do site
          </button>
        </aside>

        {/* Prévia */}
        <div className="previa">
          <div className="previa__topo">
            <span className="previa__rotulo">Prévia {atual ? `· editando camada ${camadas.indexOf(atual) + 1}` : ''}</span>
            <div className="segmentado segmentado--pequeno" role="radiogroup" aria-label="Tamanho da prévia">
              {[
                ['computador', 'Computador'],
                ['celular', 'Celular'],
              ].map(([v, r]) => (
                <button key={v} type="button" role="radio" aria-checked={dispositivo === v} onClick={() => setDispositivo(v)}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className={`previa__palco previa__palco--${dispositivo}`}>
            <iframe ref={quadro} src="/previa-layout" title="Prévia da página inicial" className="previa__quadro" onLoad={enviarParaPrevia} />
          </div>
        </div>
      </div>

      {/* Barra de controles: fica sempre visível no rodapé da tela enquanto a página rola */}
      <div className="construtor__controles" role="region" aria-label="Salvar e publicar">
        <p className="construtor__status" aria-live="polite">
          {!estado
            ? 'Carregando…'
            : alterado
              ? '● Alterações não salvas'
              : naoPublicado
                ? '● Rascunho salvo, ainda não publicado'
                : estado.publicadoEm
                  ? `✓ Publicado em ${formatarDataHora(estado.publicadoEm)}${estado.publicadoPor ? ` por ${estado.publicadoPor}` : ''}`
                  : '✓ Usando o layout padrão do site'}
        </p>
        <div className="construtor__acoes">
          <button type="button" className="botao botao--secundario botao--pequeno" disabled={!alterado || ocupado} onClick={() => setModal({ tipo: 'descartar' })}>
            <IconeDesfazer />
            Descartar
          </button>
          <button type="button" className="botao botao--secundario botao--pequeno" disabled={!alterado || ocupado} onClick={() => enviar('/api/layout', 'PUT', 'Rascunho salvo. O site ainda não mudou.')} aria-label="Salvar rascunho">
            <IconeSalvar />
            {/* no celular aparece só o rótulo curto, para os 3 botões caberem lado a lado */}
            <span className="rotulo-longo">Salvar rascunho</span>
            <span className="rotulo-curto">Rascunho</span>
          </button>
          <button type="button" className="botao botao--pequeno" disabled={!naoPublicado || ocupado} onClick={() => setModal({ tipo: 'publicar' })} aria-label="Publicar no site">
            <IconePublicar />
            <span className="rotulo-longo">Publicar no site</span>
            <span className="rotulo-curto">Publicar</span>
          </button>
        </div>
      </div>

      {/* Modais */}
      <Modal
        aberto={Boolean(modal)}
        aoFechar={() => !ocupado && setModal(null)}
        largura={modal?.tipo === 'imagens' ? 860 : modal?.tipo === 'adicionar' ? 720 : 480}
        titulo={
          {
            adicionar: 'Nova camada',
            imagens: modal?.multiplo ? 'Escolher imagens' : 'Escolher imagem',
            publicar: 'Publicar no site?',
            padrao: 'Restaurar layout padrão?',
            descartar: 'Descartar alterações?',
          }[modal?.tipo] ?? ''
        }
      >
        {modal?.tipo === 'adicionar' && (
          <ul className="modelos">
            {Object.entries(MODELOS).map(([tipo, m]) => (
              <li key={tipo}>
                <button type="button" className="modelo" onClick={() => adicionar(tipo)}>
                  <IlustracaoModelo tipo={tipo} />
                  <strong>{m.nome}</strong>
                  <span>{m.descricao}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {modal?.tipo === 'imagens' && (
          <SeletorImagens
            multiplo={modal.multiplo}
            limite={modal.limite}
            aoCancelar={() => setModal(null)}
            aoEscolher={(imgs) => {
              modal.aoEscolher(imgs)
              setModal(null)
            }}
          />
        )}
        {modal?.tipo === 'publicar' && (
          <>
            <p className="modal__texto">
              A página inicial vai mudar <strong>na hora</strong> para todos os clientes, com {camadas.filter((c) => c.visivel).length} camada(s) visível(is).
            </p>
            <div className="acoes-form">
              <button type="button" className="botao botao--secundario" onClick={() => setModal(null)} disabled={ocupado}>
                Cancelar
              </button>
              <button type="button" className="botao" onClick={() => enviar('/api/layout/publicar', 'POST', 'Layout publicado! A página inicial já mostra a nova versão.')} disabled={ocupado}>
                {ocupado ? 'Publicando…' : 'Publicar'}
              </button>
            </div>
          </>
        )}
        {modal?.tipo === 'padrao' && (
          <>
            <p className="modal__texto">As camadas atuais serão substituídas pelo layout original (banner + vitrine). Nada muda no site até você publicar.</p>
            <div className="acoes-form">
              <button type="button" className="botao botao--secundario" onClick={() => setModal(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="botao"
                onClick={() => {
                  setCamadas(comNovosIds(LAYOUT_PADRAO))
                  setSelecionada(null)
                  setModal(null)
                }}
              >
                Restaurar
              </button>
            </div>
          </>
        )}
        {modal?.tipo === 'descartar' && (
          <>
            <p className="modal__texto">As alterações feitas desde o último salvamento serão perdidas.</p>
            <div className="acoes-form">
              <button type="button" className="botao botao--secundario" onClick={() => setModal(null)}>
                Continuar editando
              </button>
              <button
                type="button"
                className="botao botao--perigo"
                onClick={() => {
                  setCamadas(clonar(estado.rascunho))
                  setSelecionada(null)
                  setModal(null)
                }}
              >
                Descartar
              </button>
            </div>
          </>
        )}
      </Modal>
    </section>
  )
}
