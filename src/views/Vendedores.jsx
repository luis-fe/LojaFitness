'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import './Vendedores.css'
import PaginaVendedor from '@/components/PaginaVendedor'
import Campo from '@/components/Campo'
import Modal from '@/components/Modal'
import { IconeEditar } from '@/components/Icones'
import { useAutenticacao } from '@/context/Autenticacao'
import { useErro } from '@/context/Erro'
import { formatarCpfCnpj, formatarDataHora, formatarTelefone, mascaraCpfCnpj, mascaraTelefone } from '@/lib/formatos'
import { UFS, enderecoCompleto, formatarCep, linkMapa, mascaraCep } from '@/lib/retirada'

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
    cep: vendedor?.cep ? formatarCep(vendedor.cep) : '',
    endereco: vendedor?.endereco ?? '',
    cidade: vendedor?.cidade ?? '',
    uf: vendedor?.uf ?? '',
    localizacao: vendedor?.localizacao ?? '',
    papel: vendedor?.papel ?? 'vendedor',
    acessa_area: vendedor ? vendedor.acessa_area !== false : true,
    recebe_whatsapp: Boolean(vendedor?.recebe_whatsapp),
    senha: '',
    confirmar: '',
  }
  const [form, setForm] = useState(inicial)
  const [erros, setErros] = useState({})
  const { mostrarErro } = useErro()
  const [salvando, setSalvando] = useState(false)

  const alterar = (campo) => (valor) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErros((e) => ({ ...e, [campo]: undefined }))
  }

  const salvar = async (e) => {
    e.preventDefault()
    const campos = ['login', 'nome', 'telefone', 'cpf_cnpj', 'nome_fantasia', 'cep', 'endereco', 'cidade', 'uf', 'localizacao', 'papel', 'acessa_area', 'recebe_whatsapp']
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
    if (!dados?.campos) mostrarErro(dados?.erro || 'Não foi possível salvar.')
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
        <div className="largo form-secao">
          <h3>Endereço para retirada</h3>
          <p>Opcional. Aparece no site, com o mapa, para o cliente que escolher “Retirar c/ vendedor”.</p>
        </div>
        <Campo rotulo="CEP" opcional valor={form.cep} aoMudar={alterar('cep')} mascara={mascaraCep} erro={erros.cep} inputMode="numeric" placeholder="00000-000" autoComplete="postal-code" />
        <div className="campo">
          <label htmlFor="uf">
            UF <span className="campo__opcional">(opcional)</span>
          </label>
          <select id="uf" value={form.uf} onChange={(e) => alterar('uf')(e.target.value)} aria-invalid={erros.uf ? true : undefined}>
            <option value="">—</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
          {erros.uf && <span className="campo__erro">{erros.uf}</span>}
        </div>
        <div className="largo">
          <Campo rotulo="Endereço" opcional valor={form.endereco} aoMudar={alterar('endereco')} erro={erros.endereco} placeholder="Rua, número, complemento e bairro" maxLength={200} autoComplete="street-address" />
        </div>
        <div className="largo">
          <Campo rotulo="Cidade" opcional valor={form.cidade} aoMudar={alterar('cidade')} erro={erros.cidade} maxLength={100} />
        </div>
        <div className="largo">
          <Campo
            rotulo="Localização no Google Maps"
            opcional
            valor={form.localizacao}
            aoMudar={alterar('localizacao')}
            erro={erros.localizacao}
            dica="No Google Maps, toque em Compartilhar → Copiar link e cole aqui. Também aceita coordenadas, ex.: -23.5505, -46.6333."
            placeholder="https://maps.app.goo.gl/…"
            maxLength={500}
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>
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
        <div className="campo largo">
          <label htmlFor="recebe_whatsapp">Recebe pedidos do WhatsApp</label>
          <select
            id="recebe_whatsapp"
            value={form.recebe_whatsapp ? 'sim' : 'nao'}
            onChange={(e) => alterar('recebe_whatsapp')(e.target.value === 'sim')}
            aria-describedby="recebe-whatsapp-dica"
            aria-invalid={erros.recebe_whatsapp ? true : undefined}
          >
            <option value="nao">Não</option>
            <option value="sim">Sim</option>
          </select>
          <span id="recebe-whatsapp-dica" className="campo__dica">
            {erros.recebe_whatsapp ||
              (form.recebe_whatsapp
                ? 'Os pedidos do site abrem o WhatsApp no telefone deste vendedor. Só um vendedor recebe: os outros são desmarcados.'
                : 'Sem nenhum vendedor marcado, os pedidos vão para o administrador.')}
          </span>
        </div>
        <div className="campo largo">
          <label htmlFor="acessa_area">Acessa Área do Vendedor</label>
          <select
            id="acessa_area"
            value={form.acessa_area ? 'sim' : 'nao'}
            onChange={(e) => alterar('acessa_area')(e.target.value === 'sim')}
            disabled={ehVoceMesmo}
            aria-describedby="acessa-area-dica"
            aria-invalid={erros.acessa_area ? true : undefined}
          >
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
          <span id="acessa-area-dica" className="campo__dica">
            {ehVoceMesmo
              ? 'Você não pode tirar o seu próprio acesso.'
              : erros.acessa_area || (form.acessa_area ? 'Pode entrar na Área do Vendedor com login e senha.' : 'Continua cadastrado e ativo, mas não consegue entrar na Área do Vendedor.')}
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
  const { mostrarErro } = useErro()
  const [salvando, setSalvando] = useState(false)

  const salvar = async (e) => {
    e.preventDefault()
    if (senha !== confirmar) return setErros({ confirmar: 'As senhas não conferem.' })
    setSalvando(true)
    const { ok, dados } = await api(`/api/vendedores/${vendedor.id}/senha`, { metodo: 'PUT', corpo: { novaSenha: senha } })
    setSalvando(false)
    if (ok) return aoSalvar()
    setErros({ senha: dados?.campos?.novaSenha })
    if (!dados?.campos) mostrarErro(dados?.erro || 'Não foi possível redefinir a senha.')
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
  const { mostrarErro } = useErro()
  const [salvando, setSalvando] = useState(false)
  const desativar = vendedor.ativo

  const confirmar = async () => {
    setSalvando(true)
    const { ok, dados } = desativar
      ? await api(`/api/vendedores/${vendedor.id}`, { metodo: 'DELETE' })
      : await api(`/api/vendedores/${vendedor.id}`, { metodo: 'PATCH', corpo: { ativo: true } })
    setSalvando(false)
    if (ok) return aoSalvar(dados.vendedor)
    aoCancelar() // fecha a confirmação e mostra só o erro
    mostrarErro(dados?.erro || 'Não foi possível concluir.')
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
          {v.ativo && v.acessa_area === false && <span className="selo selo--inativo">Sem acesso à área</span>}
          {v.ativo && v.recebe_whatsapp && <span className="selo selo--whatsapp">Recebe pedidos do WhatsApp</span>}
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
          <dt>Retirada</dt>
          <dd>
            {linkMapa(v) ? (
              <a href={linkMapa(v)} target="_blank" rel="noopener noreferrer">
                {enderecoCompleto(v) || 'Ver no Google Maps'}
              </a>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div>
          <dt>Último acesso</dt>
          <dd>{formatarDataHora(v.ultimo_login_em)}</dd>
        </div>
      </dl>

      <div className="linha-vendedor__acoes">
        <button type="button" className="linha-vendedor__editar" onClick={() => abrir('editar', v)}>
          <IconeEditar />
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
  const [situacao, setSituacao] = useState('ativos') // ativos | inativos | todos
  const [pagina, setPagina] = useState(1)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')
  const { mostrarErro } = useErro()
  const falhar = (mensagem) => {
    setErro(mensagem)
    mostrarErro(mensagem)
  }
  const [aviso, setAviso] = useState('')
  const [modal, setModal] = useState(null) // { tipo, vendedor }

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
      falhar(dados?.erro || 'Não foi possível carregar os vendedores.')
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
      trilha={[{ href: '/area-do-vendedor/perfil', rotulo: 'Perfil' }]}
      largura={960}
      fixarTopo
      acoes={
        <button type="button" className="botao botao--novo" aria-label="Novo vendedor" onClick={() => setModal({ tipo: 'novo' })}>
          Novo +
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
        <div className="campo filtros__situacao">
          <label htmlFor="situacao">Situação</label>
          <select
            id="situacao"
            value={situacao}
            onChange={(e) => {
              setSituacao(e.target.value)
              setPagina(1)
            }}
          >
            <option value="ativos">Ativos</option>
            <option value="inativos">Inativos</option>
            <option value="todos">Todos</option>
          </select>
        </div>
      </div>

      {aviso && (
        <p className="aviso aviso--sucesso" role="status" style={{ marginBottom: 16 }}>
          {aviso}
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
