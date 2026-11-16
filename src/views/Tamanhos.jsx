'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import './Cadastros.css'
import PaginaVendedor from '@/components/PaginaVendedor'
import ListaDados from '@/components/ListaDados'
import Campo from '@/components/Campo'
import Modal from '@/components/Modal'
import ConfirmarExclusao from '@/components/ConfirmarExclusao'
import { useAutenticacao } from '@/context/Autenticacao'
import { useErro } from '@/context/Erro'

const TRILHA = [{ href: '/area-do-vendedor/produtos', rotulo: 'Produtos' }]
const mascaraCodigo = (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)

export function FormTamanho({ tamanho, aoSalvar, aoCancelar }) {
  const { api } = useAutenticacao()
  const [form, setForm] = useState({ codigo: tamanho?.codigo ?? '', nome: tamanho?.nome ?? '', sequencia: tamanho?.sequencia ?? '' })
  const [erros, setErros] = useState({})
  const { mostrarErro } = useErro()
  const [salvando, setSalvando] = useState(false)
  const alterar = (c) => (v) => {
    setForm((f) => ({ ...f, [c]: v }))
    setErros((e) => ({ ...e, [c]: undefined }))
  }

  const salvar = async (e) => {
    e.preventDefault()
    const corpo = { codigo: form.codigo, nome: form.nome }
    if (form.sequencia !== '') corpo.sequencia = Number(form.sequencia)
    setSalvando(true)
    const { ok, dados } = tamanho
      ? await api(`/api/tamanhos/${encodeURIComponent(tamanho.codigo)}`, { metodo: 'PATCH', corpo })
      : await api('/api/tamanhos', { metodo: 'POST', corpo })
    setSalvando(false)
    if (ok) return aoSalvar(dados.tamanho)
    setErros(dados?.campos || {})
    if (!dados?.campos) mostrarErro(dados?.erro || 'Não foi possível salvar.')
  }

  return (
    <form onSubmit={salvar} noValidate>
      <div className="grade-campos">
        <Campo rotulo="Código" valor={form.codigo} aoMudar={alterar('codigo')} mascara={mascaraCodigo} erro={erros.codigo} placeholder="Ex.: GG" dica="Até 6 letras ou números." autoFocus />
        <Campo rotulo="Nome do tamanho" valor={form.nome} aoMudar={alterar('nome')} erro={erros.nome} placeholder="Ex.: Extra grande" maxLength={40} />
        <Campo
          rotulo="Sequência de exibição"
          opcional={!tamanho}
          tipo="number"
          valor={form.sequencia}
          aoMudar={alterar('sequencia')}
          erro={erros.sequencia}
          min={1}
          max={999}
          dica={tamanho ? 'Posição na grade do produto (1 = primeiro).' : 'Vazio = vai para o fim da lista.'}
        />
      </div>
      {tamanho?.em_uso > 0 && <p className="campo__dica" style={{ marginTop: 12 }}>Usado em {tamanho.em_uso} variação(ões): mudar o código atualiza todas automaticamente.</p>}
      <div className="acoes-form">
        <button type="button" className="botao botao--secundario" onClick={aoCancelar}>
          Cancelar
        </button>
        <button type="submit" className="botao" disabled={salvando}>
          {salvando ? 'Salvando…' : tamanho ? 'Salvar' : 'Cadastrar tamanho'}
        </button>
      </div>
    </form>
  )
}

export default function Tamanhos() {
  const { api } = useAutenticacao()
  const [tamanhos, setTamanhos] = useState(null)
  const [erro, setErro] = useState('')
  const { mostrarErro } = useErro()
  const falhar = (mensagem) => {
    setErro(mensagem)
    mostrarErro(mensagem)
  }
  const [aviso, setAviso] = useState('')
  const [modal, setModal] = useState(null) // { tipo: 'novo' | 'editar' | 'excluir', item }
  const [busca, setBusca] = useState('')

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!tamanhos || !t) return tamanhos
    return tamanhos.filter((x) => `${x.codigo} ${x.nome}`.toLowerCase().includes(t))
  }, [tamanhos, busca])

  const carregar = useCallback(async () => {
    const { ok, dados } = await api('/api/tamanhos')
    if (ok) setTamanhos(dados.tamanhos)
    else falhar(dados?.erro || 'Não foi possível carregar os tamanhos.')
  }, [api])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    if (!aviso) return
    const id = setTimeout(() => setAviso(''), 4000)
    return () => clearTimeout(id)
  }, [aviso])

  // Sobe/desce na sequência de exibição (sempre pela ordem salva, não pela ordenação da lista)
  const mover = async (item, direcao) => {
    const ordem = tamanhos.map((t) => t.codigo)
    const i = ordem.indexOf(item.codigo)
    const j = i + direcao
    if (j < 0 || j >= ordem.length) return
    ;[ordem[i], ordem[j]] = [ordem[j], ordem[i]]
    const { ok, dados } = await api('/api/tamanhos/ordem', { metodo: 'PUT', corpo: { codigos: ordem } })
    if (ok) setTamanhos(dados.tamanhos)
    else falhar(dados?.erro || 'Não foi possível reordenar.')
  }

  const concluir = (msg) => {
    setModal(null)
    setAviso(msg)
    carregar()
  }

  return (
    <PaginaVendedor
      titulo="Tamanhos"
      trilha={TRILHA}
      largura={960}
      fixarTopo
      acoes={
        <button type="button" className="botao botao--compacto botao--dourado" aria-label="Novo tamanho" onClick={() => setModal({ tipo: 'novo' })}>
          + Novo
        </button>
      }
    >
      <div aria-live="polite">{aviso && <p className="aviso aviso--sucesso cadastro__aviso">{aviso}</p>}</div>

      {tamanhos && tamanhos.length > 0 && (
        <div className="campo cadastro__busca">
          <label htmlFor="busca-tamanhos" className="sr-only">
            Buscar tamanhos
          </label>
          <input id="busca-tamanhos" type="search" placeholder="Buscar por código ou nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
      )}

      {!tamanhos && !erro ? (
        <div className="cadastro__carregando" aria-busy="true" aria-label="Carregando tamanhos" />
      ) : tamanhos ? (
        <ListaDados
          rotulo="Tamanhos"
          itens={filtrados}
          chave={(t) => t.codigo}
          ordemInicial={{ coluna: 'sequencia', direcao: 'asc' }}
          vazio={busca ? `Nenhum tamanho encontrado para “${busca}”.` : 'Nenhum tamanho cadastrado.'}
          colunas={[
            { id: 'sequencia', titulo: 'Sequência', valor: (t) => t.sequencia, alinhar: 'direita' },
            { id: 'codigo', titulo: 'Código', valor: (t) => t.codigo, destaque: true },
            { id: 'nome', titulo: 'Nome', valor: (t) => t.nome },
            { id: 'em_uso', titulo: 'Em uso', valor: (t) => t.em_uso, exibir: (t) => (t.em_uso ? `${t.em_uso} variação(ões)` : '—'), alinhar: 'direita' },
          ]}
          acoes={(t) => {
            const pos = tamanhos.findIndex((x) => x.codigo === t.codigo)
            return (
              <>
                <button type="button" className="lista-acao" onClick={() => mover(t, -1)} disabled={pos === 0} aria-label={`Subir ${t.codigo} na sequência`}>
                  ↑ Subir
                </button>
                <button type="button" className="lista-acao" onClick={() => mover(t, 1)} disabled={pos === tamanhos.length - 1} aria-label={`Descer ${t.codigo} na sequência`}>
                  ↓ Descer
                </button>
                <button type="button" className="lista-acao" onClick={() => setModal({ tipo: 'editar', item: t })}>
                  Editar
                </button>
                <button
                  type="button"
                  className="lista-acao is-perigo"
                  onClick={() => setModal({ tipo: 'excluir', item: t })}
                  disabled={t.em_uso > 0}
                  title={t.em_uso > 0 ? 'Em uso em variações de produtos' : undefined}
                >
                  Excluir
                </button>
              </>
            )
          }}
        />
      ) : null}

      <Modal
        aberto={Boolean(modal)}
        aoFechar={() => setModal(null)}
        titulo={{ novo: 'Novo tamanho', editar: 'Editar tamanho', excluir: 'Excluir tamanho?' }[modal?.tipo] ?? ''}
        largura={modal?.tipo === 'excluir' ? 440 : 560}
      >
        {(modal?.tipo === 'novo' || modal?.tipo === 'editar') && (
          <FormTamanho
            key={modal.item?.codigo ?? 'novo'}
            tamanho={modal.item}
            aoCancelar={() => setModal(null)}
            aoSalvar={(t) => concluir(modal.tipo === 'novo' ? `Tamanho ${t.codigo} cadastrado.` : `Tamanho ${t.codigo} atualizado.`)}
          />
        )}
        {modal?.tipo === 'excluir' && (
          <ConfirmarExclusao
            mensagem={`O tamanho ${modal.item.codigo} (${modal.item.nome}) será excluído.`}
            aoConfirmar={() => api(`/api/tamanhos/${encodeURIComponent(modal.item.codigo)}`, { metodo: 'DELETE' })}
            aoConcluir={() => concluir(`Tamanho ${modal.item.codigo} excluído.`)}
            aoCancelar={() => setModal(null)}
          />
        )}
      </Modal>
    </PaginaVendedor>
  )
}
