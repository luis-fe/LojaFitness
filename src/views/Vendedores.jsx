'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import './Vendedores.css'
import PaginaVendedor from '@/components/PaginaVendedor'
import Campo from '@/components/Campo'
import Modal from '@/components/Modal'
import { useAutenticacao } from '@/context/Autenticacao'
import { formatarCpfCnpj, formatarDataHora, formatarTelefone, mascaraCpfCnpj, mascaraTelefone } from '@/lib/formatos'

const POR_PAGINA = 10

// ---------------------------------------------------------------------------
// Formulário de cadastro / edição
// ---------------------------------------------------------------------------
function FormVendedor({ vendedor, ehVoceMesmo, aoSalvar, aoCancelar }) {
  const { api } = useAutenticacao()
  const editando = Boolean(vendedor)
  const inicial = {
    login: vendedor?.login ?? '',
    nome: vendedor?.nome ?? '',
    telefone: vendedor ? formatarTelefone(vendedor.telefone) : '',
    cpf_cnpj: vendedor?.cpf_cnpj ? formatarCpfCnpj(vendedor.cpf_cnpj) : '',
    nome_fantasia: vendedor?.nome_fantasia ?? '',
    papel: vendedor?.papel ?? 'vendedor',
    senha: '',
    confirmar: '',
  }
  const [form, setForm] = useState(inicial)
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [salvando, setSalvando] = useState(false)

  const alterar = (campo) => (valor) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErros((e) => ({ ...e, [campo]: undefined }))
    setErroGeral('')
  }

  const salvar = async (e) => {
    e.preventDefault()
    const campos = ['login', 'nome', 'telefone', 'cpf_cnpj', 'nome_fantasia', 'papel']
    let corpo
    if (editando) {
      // Envia só o que mudou
      corpo = Object.fromEntries(campos.filter((c) => form[c] !== inicial[c]).map((c) => [c, form[c]]))
      if (!Object.keys(corpo).length) return aoCancelar()
    } else {
      if (form.senha !== form.confirmar) return setErros({ confirmar: 'As senhas não conferem.' })
      corpo = { ...Object.fromEntries(campos.map((c) => [c, form[c]])), senha: form.senha }
    }

    setSalvando(true)
    const { ok, dados } = await api(editando ? `/api/vendedores/${vendedor.id}` : '/api/vendedores', {
      metodo: editando ? 'PATCH' : 'POST',
      corpo,
    })
    setSalvando(false)
    if (ok) return aoSalvar(dados.vendedor)
    setErros(dados?.campos || {})
    setErroGeral(dados?.campos ? '' : dados?.erro || 'Não foi possível salvar.')
  }

  return (
    <form onSubmit={salvar} noValidate>
      <div className="grade-campos">
        <div className="largo">
          <Campo rotulo="Nome" valor={form.nome} aoMudar={alterar('nome')} erro={erros.nome} required />
        </div>
        <Campo
          rotulo="Login"
          valor={form.login}
          aoMudar={(v) => alterar('login')(v.toLowerCase().replace(/\s/g, ''))}
          erro={erros.login}
          dica="Letras minúsculas, números, ponto, hífen ou _."
          autoCapitalize="none"
          spellCheck={false}
          autoComplete="off"
          required
        />
        <Campo
          rotulo="Telefone"
          valor={form.telefone}
          aoMudar={alterar('telefone')}
          mascara={mascaraTelefone}
          erro={erros.telefone}
          inputMode="tel"
          placeholder="(11) 98765-4321"
          required
        />
        <Campo
          rotulo="CPF/CNPJ"
          opcional
          valor={form.cpf_cnpj}
          aoMudar={alterar('cpf_cnpj')}
          mascara={mascaraCpfCnpj}
          erro={erros.cpf_cnpj}
          inputMode="numeric"
        />
        <Campo
          rotulo="Nome fantasia"
          opcional
          valor={form.nome_fantasia}
          aoMudar={alterar('nome_fantasia')}
          erro={erros.nome_fantasia}
        />
        <div className="campo largo">
          <label htmlFor="papel">Perfil de acesso</label>
          <select
            id="papel"
            value={form.papel}
            onChange={(e) => alterar('papel')(e.target.value)}
            disabled={ehVoceMesmo}
            aria-describedby="papel-dica"
          >
            <option value="vendedor">Vendedor — acessa só o próprio cadastro</option>
            <option value="admin">Administrador — gerencia vendedores</option>
          </select>
          <span id="papel-dica" className="campo__dica">
            {ehVoceMesmo ? 'Você não pode alterar o seu próprio perfil de acesso.' : erros.papel}
          </span>
        </div>

        {!editando && (
          <>
            <Campo
              rotulo="Senha"
              tipo="password"
              valor={form.senha}
              aoMudar={alterar('senha')}
              erro={erros.senha}
              dica="Mínimo de 8 caracteres."
              autoComplete="new-password"
              required
            />
            <Campo
              rotulo="Confirmar senha"
              tipo="password"
              valor={form.confirmar}
              aoMudar={alterar('confirmar')}
              erro={erros.confirmar}
              autoComplete="new-password"
              required
            />
          </>
        )}
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
          {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Cadastrar vendedor'}
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Redefinir senha (admin)
// ---------------------------------------------------------------------------
function FormRedefinirSenha({ vendedor, aoSalvar, aoCancelar }) {
  const { api } = useAutenticacao()
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [salvando, setSalvando] = useState(false)

  const salvar = async (e) => {
    e.preventDefault()
    if (senha !== confirmar) return setErros({ confirmar: 'As senhas não conferem.' })
    setSalvando(true)
    const { ok, dados } = await api(`/api/vendedores/${vendedor.id}/senha`, { metodo: 'PUT', corpo: { novaSenha: senha } })
    setSalvando(false)
    if (ok) return aoSalvar()
    setErros({ senha: dados?.campos?.novaSenha })
    setErroGeral(dados?.campos ? '' : dados?.erro || 'Não foi possível redefinir a senha.')
  }

  return (
    <form onSubmit={salvar} noValidate>
      <p className="modal__texto">
        Defina uma nova senha para <strong>{vendedor.nome}</strong>. As sessões abertas dessa pessoa serão encerradas e
        ela precisará entrar com a nova senha.
      </p>
      <div className="grade-campos">
        <Campo
          rotulo="Nova senha"
          tipo="password"
          valor={senha}
          aoMudar={(v) => {
            setSenha(v)
            setErros({})
          }}
          erro={erros.senha}
          dica="Mínimo de 8 caracteres."
          autoComplete="new-password"
        />
        <Campo
          rotulo="Confirmar senha"
          tipo="password"
          valor={confirmar}
          aoMudar={(v) => {
            setConfirmar(v)
            setErros({})
          }}
          erro={erros.confirmar}
          autoComplete="new-password"
        />
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
        <button type="submit" className="botao" disabled={!senha || !confirmar || salvando}>
          {salvando ? 'Salvando…' : 'Redefinir senha'}
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Confirmação de desativar / reativar
// ---------------------------------------------------------------------------
function ConfirmarSituacao({ vendedor, aoSalvar, aoCancelar }) {
  const { api } = useAutenticacao()
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const desativar = vendedor.ativo

  const confirmar = async () => {
    setSalvando(true)
    const { ok, dados } = desativar
      ? await api(`/api/vendedores/${vendedor.id}`, { metodo: 'DELETE' })
      : await api(`/api/vendedores/${vendedor.id}`, { metodo: 'PATCH', corpo: { ativo: true } })
    setSalvando(false)
    if (ok) return aoSalvar(dados.vendedor)
    setErro(dados?.erro || 'Não foi possível concluir.')
  }

  return (
    <>
      <p className="modal__texto">
        {desativar ? (
          <>
            <strong>{vendedor.nome}</strong> não conseguirá mais entrar e as sessões abertas serão encerradas na hora. O
            cadastro e o histórico continuam guardados; você pode reativar quando quiser.
          </>
        ) : (
          <>
            <strong>{vendedor.nome}</strong> voltará a conseguir entrar com a senha atual.
          </>
        )}
      </p>
      {erro && (
        <p className="aviso aviso--erro" role="alert" style={{ marginTop: 16 }}>
          {erro}
        </p>
      )}
      <div className="acoes-form">
        <button type="button" className="botao botao--secundario" onClick={aoCancelar}>
          Cancelar
        </button>
        <button type="button" className={`botao ${desativar ? 'botao--perigo' : ''}`} onClick={confirmar} disabled={salvando}>
          {salvando ? 'Aguarde…' : desativar ? 'Desativar' : 'Reativar'}
        </button>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Linha da lista
// ---------------------------------------------------------------------------
function LinhaVendedor({ v, ehVoceMesmo, abrir }) {
  return (
    <li className={`linha-vendedor ${v.ativo ? '' : 'is-inativo'}`}>
      <div className="linha-vendedor__principal">
        <div className="linha-vendedor__nome">
          <strong>{v.nome}</strong>
          {ehVoceMesmo && <span className="selo selo--voce">Você</span>}
          {v.papel === 'admin' && <span className="selo">Admin</span>}
          {!v.ativo && <span className="selo selo--inativo">Inativo</span>}
        </div>
        {v.nome_fantasia && <span className="linha-vendedor__fantasia">{v.nome_fantasia}</span>}
      </div>

      <dl className="linha-vendedor__dados">
        <div>
          <dt>Login</dt>
          <dd>{v.login}</dd>
        </div>
        <div>
          <dt>Telefone</dt>
          <dd>
            <a href={`https://wa.me/${v.telefone.length <= 11 ? '55' + v.telefone : v.telefone}`} target="_blank" rel="noopener noreferrer">
              {formatarTelefone(v.telefone)}
            </a>
          </dd>
        </div>
        <div>
          <dt>{v.tipo_documento ? v.tipo_documento.toUpperCase() : 'CPF/CNPJ'}</dt>
          <dd>{v.cpf_cnpj ? formatarCpfCnpj(v.cpf_cnpj) : '—'}</dd>
        </div>
        <div>
          <dt>Último acesso</dt>
          <dd>{formatarDataHora(v.ultimo_login_em)}</dd>
        </div>
      </dl>

      <div className="linha-vendedor__acoes">
        <button type="button" onClick={() => abrir('editar', v)}>
          Editar
        </button>
        {!ehVoceMesmo && (
          <>
            <button type="button" onClick={() => abrir('senha', v)}>
              Redefinir senha
            </button>
            <button type="button" className={v.ativo ? 'is-perigo' : ''} onClick={() => abrir('situacao', v)}>
              {v.ativo ? 'Desativar' : 'Reativar'}
            </button>
          </>
        )}
      </div>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------
export default function Vendedores() {
  const { api, vendedor: eu, atualizarVendedorSessao } = useAutenticacao()
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [situacao, setSituacao] = useState('todos') // todos | ativos | inativos
  const [pagina, setPagina] = useState(1)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [modal, setModal] = useState(null) // { tipo, vendedor }

  // Veio do card "Novo Vendedor" (?novo=1): abre o cadastro e limpa o endereço
  useEffect(() => {
    if (eu?.papel !== 'admin') return
    const url = new URL(window.location.href)
    if (url.searchParams.get('novo') === '1') {
      setModal({ tipo: 'novo' })
      url.searchParams.delete('novo')
      window.history.replaceState(null, '', url.pathname + url.search)
    }
  }, [eu?.papel])

  // Espera a pessoa parar de digitar para buscar
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
    if (situacao !== 'todos') params.set('ativo', String(situacao === 'ativos'))
    const { ok, dados } = await api(`/api/vendedores?${params}`)
    if (ok) {
      setResultado(dados)
      setErro('')
    } else {
      setErro(dados?.erro || 'Não foi possível carregar os vendedores.')
    }
  }, [api, pagina, buscaAplicada, situacao])

  useEffect(() => {
    if (eu?.papel === 'admin') carregar()
  }, [carregar, eu?.papel])

  // Some sozinho depois de alguns segundos
  useEffect(() => {
    if (!aviso) return
    const id = setTimeout(() => setAviso(''), 5000)
    return () => clearTimeout(id)
  }, [aviso])

  if (eu?.papel !== 'admin') {
    return (
      <PaginaVendedor titulo="Vendedores" trilha={[{ href: '/area-do-vendedor/perfil', rotulo: 'Perfil' }]}>
        <p className="aviso aviso--erro" role="alert">
          Somente administradores podem gerenciar vendedores. <Link href="/area-do-vendedor/perfil/alterar">Ir para o meu perfil</Link>
        </p>
      </PaginaVendedor>
    )
  }

  const fechar = () => setModal(null)
  const concluir = (mensagem) => {
    setModal(null)
    setAviso(mensagem)
    carregar()
  }

  const titulos = {
    novo: 'Novo vendedor',
    editar: 'Editar vendedor',
    senha: 'Redefinir senha',
    situacao: modal?.vendedor?.ativo ? 'Desativar vendedor?' : 'Reativar vendedor?',
  }

  const { vendedores = [], paginacao } = resultado ?? {}

  return (
    <PaginaVendedor
      titulo="Vendedores"
      descricao="Cadastre e gerencie quem acessa a Área do Vendedor."
      trilha={[{ href: '/area-do-vendedor/perfil', rotulo: 'Perfil' }]}
      largura={960}
      acoes={
        <button type="button" className="botao" onClick={() => setModal({ tipo: 'novo' })}>
          + Novo vendedor
        </button>
      }
    >
      <div className="filtros">
        <div className="campo filtros__busca">
          <label htmlFor="busca">Buscar</label>
          <input
            id="busca"
            type="search"
            placeholder="Nome, login, telefone ou CPF/CNPJ"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="filtros__situacao" role="group" aria-label="Situação">
          {[
            ['todos', 'Todos'],
            ['ativos', 'Ativos'],
            ['inativos', 'Inativos'],
          ].map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={situacao === valor}
              onClick={() => {
                setSituacao(valor)
                setPagina(1)
              }}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      {aviso && (
        <p className="aviso aviso--sucesso" role="status" style={{ marginBottom: 16 }}>
          {aviso}
        </p>
      )}
      {erro && (
        <p className="aviso aviso--erro" role="alert" style={{ marginBottom: 16 }}>
          {erro}
        </p>
      )}

      {!resultado && !erro && <div className="lista-carregando" aria-busy="true" aria-label="Carregando vendedores" />}

      {resultado && (
        <>
          <p className="lista-total" aria-live="polite">
            {paginacao.total} {paginacao.total === 1 ? 'vendedor encontrado' : 'vendedores encontrados'}
          </p>

          {vendedores.length === 0 ? (
            <div className="lista-vazia">
              <p>Nenhum vendedor encontrado{buscaAplicada ? ` para “${buscaAplicada}”` : ''}.</p>
            </div>
          ) : (
            <ul className="lista-vendedores">
              {vendedores.map((v) => (
                <LinhaVendedor key={v.id} v={v} ehVoceMesmo={v.id === eu.id} abrir={(tipo, vend) => setModal({ tipo, vendedor: vend })} />
              ))}
            </ul>
          )}

          {paginacao.totalPaginas > 1 && (
            <nav className="paginacao" aria-label="Páginas">
              <button type="button" className="botao botao--secundario" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                ‹ Anterior
              </button>
              <span>
                Página {paginacao.pagina} de {paginacao.totalPaginas}
              </span>
              <button
                type="button"
                className="botao botao--secundario"
                disabled={pagina >= paginacao.totalPaginas}
                onClick={() => setPagina((p) => p + 1)}
              >
                Próxima ›
              </button>
            </nav>
          )}
        </>
      )}

      <Modal aberto={Boolean(modal)} aoFechar={fechar} titulo={modal ? titulos[modal.tipo] : ''} largura={modal?.tipo === 'situacao' ? 460 : 600}>
        {(modal?.tipo === 'novo' || modal?.tipo === 'editar') && (
          <FormVendedor
            key={modal.vendedor?.id ?? 'novo'}
            vendedor={modal.vendedor}
            ehVoceMesmo={modal.vendedor?.id === eu.id}
            aoCancelar={fechar}
            aoSalvar={(salvo) => {
              if (salvo.id === eu.id) atualizarVendedorSessao({ nome: salvo.nome, nome_fantasia: salvo.nome_fantasia, login: salvo.login })
              concluir(modal.tipo === 'novo' ? `Vendedor ${salvo.nome} cadastrado.` : 'Alterações salvas.')
            }}
          />
        )}
        {modal?.tipo === 'senha' && (
          <FormRedefinirSenha vendedor={modal.vendedor} aoCancelar={fechar} aoSalvar={() => concluir(`Senha de ${modal.vendedor.nome} redefinida.`)} />
        )}
        {modal?.tipo === 'situacao' && (
          <ConfirmarSituacao
            vendedor={modal.vendedor}
            aoCancelar={fechar}
            aoSalvar={(v) => concluir(v.ativo ? `${v.nome} foi reativado.` : `${v.nome} foi desativado.`)}
          />
        )}
      </Modal>
    </PaginaVendedor>
  )
}
