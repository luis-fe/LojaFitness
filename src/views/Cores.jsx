'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import './Cadastros.css'
import PaginaVendedor from '@/components/PaginaVendedor'
import ListaDados from '@/components/ListaDados'
import Campo from '@/components/Campo'
import Modal from '@/components/Modal'
import ConfirmarExclusao from '@/components/ConfirmarExclusao'
import { useAutenticacao } from '@/context/Autenticacao'

const TRILHA = [{ href: '/area-do-vendedor/produtos', rotulo: 'Produtos' }]

const codigoDoNome = (v) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 30)

const hexValido = (v) => /^#[0-9A-F]{6}$/i.test(v)

export function AmostraCor({ rgb, tamanho = 22 }) {
  return <span className="amostra-cor" style={{ background: rgb, width: tamanho, height: tamanho }} aria-hidden="true" />
}

export function FormCor({ cor, aoSalvar, aoCancelar }) {
  const { api } = useAutenticacao()
  const [form, setForm] = useState({ nome: cor?.nome ?? '', codigo: cor?.codigo ?? '', rgb: cor?.rgb ?? '#000000' })
  const [codigoEditado, setCodigoEditado] = useState(Boolean(cor))
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [salvando, setSalvando] = useState(false)

  const alterar = (c) => (v) => {
    setForm((f) => {
      const novo = { ...f, [c]: v }
      // Sugere o código pelo nome até a pessoa editar o código manualmente
      if (c === 'nome' && !codigoEditado) novo.codigo = codigoDoNome(v)
      return novo
    })
    if (c === 'codigo') setCodigoEditado(true)
    setErros((e) => ({ ...e, [c]: undefined }))
  }

  const salvar = async (e) => {
    e.preventDefault()
    setSalvando(true)
    const corpo = { nome: form.nome, codigo: form.codigo, rgb: form.rgb }
    const { ok, dados } = cor
      ? await api(`/api/cores/${encodeURIComponent(cor.codigo)}`, { metodo: 'PATCH', corpo })
      : await api('/api/cores', { metodo: 'POST', corpo })
    setSalvando(false)
    if (ok) return aoSalvar(dados.cor)
    setErros(dados?.campos || {})
    setErroGeral(dados?.campos ? '' : dados?.erro || 'Não foi possível salvar.')
  }

  return (
    <form onSubmit={salvar} noValidate>
      <div className="grade-campos">
        <Campo rotulo="Nome da cor" valor={form.nome} aoMudar={alterar('nome')} erro={erros.nome} placeholder="Ex.: Verde militar" maxLength={40} autoFocus />
        <Campo
          rotulo="Código da cor"
          valor={form.codigo}
          aoMudar={alterar('codigo')}
          mascara={codigoDoNome}
          erro={erros.codigo}
          dica={cor?.em_uso ? `Usada em ${cor.em_uso} variação(ões): mudar o código atualiza todas.` : 'Gerado a partir do nome; pode ajustar.'}
        />
        <div className="campo largo">
          <label htmlFor="cor-rgb">Cor (RGB)</label>
          <div className="seletor-cor">
            <input
              type="color"
              value={hexValido(form.rgb) ? form.rgb : '#000000'}
              onChange={(e) => alterar('rgb')(e.target.value.toUpperCase())}
              aria-label="Escolher a cor"
            />
            <input
              id="cor-rgb"
              value={form.rgb}
              onChange={(e) => alterar('rgb')(e.target.value.toUpperCase().slice(0, 7))}
              aria-invalid={erros.rgb ? true : undefined}
              placeholder="#4A7FD8"
              spellCheck={false}
            />
            <AmostraCor rgb={hexValido(form.rgb) ? form.rgb : 'transparent'} tamanho={44} />
          </div>
          {erros.rgb ? <span className="campo__erro">{erros.rgb}</span> : <span className="campo__dica">Clique no quadrado para escolher ou digite o código #RRGGBB.</span>}
        </div>
      </div>
      {erroGeral && (
        <p className="aviso aviso--erro" role="alert" style={{ marginTop: 16 }}>
          {erroGeral}
        </p>
      )}
      <div className="acoes-form">
        <button type="button" className="botao botao--secundario" onClick={aoCancelar}>
          Cancelar
        </button>
        <button type="submit" className="botao" disabled={salvando}>
          {salvando ? 'Salvando…' : cor ? 'Salvar' : 'Cadastrar cor'}
        </button>
      </div>
    </form>
  )
}

export default function Cores() {
  const { api } = useAutenticacao()
  const [cores, setCores] = useState(null)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [modal, setModal] = useState(null)
  const [busca, setBusca] = useState('')

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!cores || !t) return cores
    return cores.filter((c) => `${c.codigo} ${c.nome} ${c.rgb}`.toLowerCase().includes(t))
  }, [cores, busca])

  const carregar = useCallback(async () => {
    const { ok, dados } = await api('/api/cores')
    if (ok) setCores(dados.cores)
    else setErro(dados?.erro || 'Não foi possível carregar as cores.')
  }, [api])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    if (!aviso) return
    const id = setTimeout(() => setAviso(''), 4000)
    return () => clearTimeout(id)
  }, [aviso])

  const concluir = (msg) => {
    setModal(null)
    setAviso(msg)
    carregar()
  }

  return (
    <PaginaVendedor
      titulo="Cores"
      trilha={TRILHA}
      largura={960}
      fixarTopo
      acoes={
        <button type="button" className="botao botao--compacto botao--dourado" aria-label="Nova cor" onClick={() => setModal({ tipo: 'novo' })}>
          + Novo
        </button>
      }
    >
      <div aria-live="polite">{aviso && <p className="aviso aviso--sucesso cadastro__aviso">{aviso}</p>}</div>
      {erro && (
        <p className="aviso aviso--erro cadastro__aviso" role="alert">
          {erro}
        </p>
      )}

      {cores && cores.length > 0 && (
        <div className="campo cadastro__busca">
          <label htmlFor="busca-cores" className="sr-only">
            Buscar cores
          </label>
          <input id="busca-cores" type="search" placeholder="Buscar por nome, código ou RGB" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
      )}

      {!cores && !erro ? (
        <div className="cadastro__carregando" aria-busy="true" aria-label="Carregando cores" />
      ) : cores ? (
        <ListaDados
          rotulo="Cores"
          itens={filtrados}
          chave={(c) => c.codigo}
          ordemInicial={{ coluna: 'nome', direcao: 'asc' }}
          vazio={busca ? `Nenhuma cor encontrada para “${busca}”.` : 'Nenhuma cor cadastrada.'}
          colunas={[
            {
              id: 'nome',
              titulo: 'Nome',
              valor: (c) => c.nome,
              destaque: true,
              exibir: (c) => (
                <span className="cor-nome">
                  <AmostraCor rgb={c.rgb} /> {c.nome}
                </span>
              ),
            },
            { id: 'codigo', titulo: 'Código', valor: (c) => c.codigo },
            { id: 'rgb', titulo: 'RGB', valor: (c) => c.rgb, letraALetra: true, exibir: (c) => <code className="cor-rgb">{c.rgb}</code> },
            { id: 'em_uso', titulo: 'Em uso', valor: (c) => c.em_uso, exibir: (c) => (c.em_uso ? `${c.em_uso} variação(ões)` : '—'), alinhar: 'direita' },
          ]}
          acoes={(c) => (
            <>
              <button type="button" className="lista-acao" onClick={() => setModal({ tipo: 'editar', item: c })}>
                Editar
              </button>
              <button
                type="button"
                className="lista-acao is-perigo"
                onClick={() => setModal({ tipo: 'excluir', item: c })}
                disabled={c.em_uso > 0}
                title={c.em_uso > 0 ? 'Em uso em variações de produtos' : undefined}
              >
                Excluir
              </button>
            </>
          )}
        />
      ) : null}

      <Modal
        aberto={Boolean(modal)}
        aoFechar={() => setModal(null)}
        titulo={{ novo: 'Nova cor', editar: 'Editar cor', excluir: 'Excluir cor?' }[modal?.tipo] ?? ''}
        largura={modal?.tipo === 'excluir' ? 440 : 560}
      >
        {(modal?.tipo === 'novo' || modal?.tipo === 'editar') && (
          <FormCor
            key={modal.item?.codigo ?? 'nova'}
            cor={modal.item}
            aoCancelar={() => setModal(null)}
            aoSalvar={(c) => concluir(modal.tipo === 'novo' ? `Cor ${c.nome} cadastrada.` : `Cor ${c.nome} atualizada.`)}
          />
        )}
        {modal?.tipo === 'excluir' && (
          <ConfirmarExclusao
            mensagem={`A cor ${modal.item.nome} (${modal.item.codigo}) será excluída.`}
            aoConfirmar={() => api(`/api/cores/${encodeURIComponent(modal.item.codigo)}`, { metodo: 'DELETE' })}
            aoConcluir={() => concluir(`Cor ${modal.item.nome} excluída.`)}
            aoCancelar={() => setModal(null)}
          />
        )}
      </Modal>
    </PaginaVendedor>
  )
}
