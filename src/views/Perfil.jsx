'use client'

import { useEffect, useState } from 'react'
import PaginaVendedor from '@/components/PaginaVendedor'
import Campo from '@/components/Campo'
import { useAutenticacao } from '@/context/Autenticacao'
import { formatarCpfCnpj, formatarDataHora, formatarTelefone, mascaraCpfCnpj, mascaraTelefone } from '@/lib/formatos'

const vazio = { nome: '', telefone: '', cpf_cnpj: '', nome_fantasia: '' }

function paraFormulario(v) {
  return {
    nome: v.nome,
    telefone: formatarTelefone(v.telefone),
    cpf_cnpj: v.cpf_cnpj ? formatarCpfCnpj(v.cpf_cnpj) : '',
    nome_fantasia: v.nome_fantasia ?? '',
  }
}

function DadosPessoais() {
  const { api, atualizarVendedorSessao } = useAutenticacao()
  const [vendedor, setVendedor] = useState(null)
  const [form, setForm] = useState(vazio)
  const [erros, setErros] = useState({})
  const [aviso, setAviso] = useState(null) // { tipo, texto }
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    api('/api/vendedores/eu').then(({ ok, dados }) => {
      if (ok) {
        setVendedor(dados.vendedor)
        setForm(paraFormulario(dados.vendedor))
      } else {
        setAviso({ tipo: 'erro', texto: dados?.erro || 'Não foi possível carregar seus dados.' })
      }
    })
  }, [api])

  const alterar = (campo) => (valor) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErros((e) => ({ ...e, [campo]: undefined }))
    setAviso(null)
  }

  const original = vendedor ? paraFormulario(vendedor) : vazio
  const alterados = Object.keys(form).filter((c) => form[c] !== original[c])

  const salvar = async (e) => {
    e.preventDefault()
    if (!alterados.length) return
    setSalvando(true)
    setAviso(null)
    const corpo = Object.fromEntries(alterados.map((c) => [c, form[c]]))
    const { ok, dados } = await api('/api/vendedores/eu', { metodo: 'PATCH', corpo })
    setSalvando(false)
    if (ok) {
      setVendedor(dados.vendedor)
      setForm(paraFormulario(dados.vendedor))
      setErros({})
      atualizarVendedorSessao({ nome: dados.vendedor.nome, nome_fantasia: dados.vendedor.nome_fantasia })
      setAviso({ tipo: 'sucesso', texto: 'Dados atualizados.' })
    } else {
      setErros(dados?.campos || {})
      setAviso({ tipo: 'erro', texto: dados?.erro || 'Não foi possível salvar.' })
    }
  }

  if (!vendedor) {
    return aviso ? (
      <p className="aviso aviso--erro" role="alert">{aviso.texto}</p>
    ) : (
      <div className="cartao" style={{ height: 320, background: 'var(--cinza-claro)' }} aria-busy="true" />
    )
  }

  return (
    <form className="cartao" onSubmit={salvar} noValidate>
      <h2 className="cartao__titulo">Dados pessoais</h2>
      <p className="cartao__descricao">
        Login <strong>{vendedor.login}</strong> · {vendedor.papel === 'admin' ? 'Administrador' : 'Vendedor'} · último
        acesso {formatarDataHora(vendedor.ultimo_login_em)}
      </p>

      <div className="grade-campos">
        <div className="largo">
          <Campo rotulo="Nome" valor={form.nome} aoMudar={alterar('nome')} erro={erros.nome} autoComplete="name" required />
        </div>
        <Campo
          rotulo="Telefone"
          valor={form.telefone}
          aoMudar={alterar('telefone')}
          mascara={mascaraTelefone}
          erro={erros.telefone}
          inputMode="tel"
          autoComplete="tel-national"
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
        <div className="largo">
          <Campo
            rotulo="Nome fantasia"
            opcional
            valor={form.nome_fantasia}
            aoMudar={alterar('nome_fantasia')}
            erro={erros.nome_fantasia}
            dica="Aparece na saudação da Área do Vendedor."
            autoComplete="organization"
          />
        </div>
      </div>

      {aviso && (
        <p className={`aviso aviso--${aviso.tipo}`} role={aviso.tipo === 'erro' ? 'alert' : 'status'} style={{ marginTop: 16 }}>
          {aviso.texto}
        </p>
      )}

      <div className="acoes-form">
        <button
          type="button"
          className="botao botao--secundario"
          disabled={!alterados.length || salvando}
          onClick={() => {
            setForm(original)
            setErros({})
            setAviso(null)
          }}
        >
          Desfazer
        </button>
        <button type="submit" className="botao" disabled={!alterados.length || salvando}>
          {salvando ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  )
}

function TrocarSenha() {
  const { api, entrar, vendedor } = useAutenticacao()
  const [form, setForm] = useState({ senhaAtual: '', novaSenha: '', confirmar: '' })
  const [erros, setErros] = useState({})
  const [aviso, setAviso] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const alterar = (campo) => (valor) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErros((e) => ({ ...e, [campo]: undefined }))
    setAviso(null)
  }

  const salvar = async (e) => {
    e.preventDefault()
    if (form.novaSenha !== form.confirmar) {
      setErros({ confirmar: 'As senhas não conferem.' })
      return
    }
    setSalvando(true)
    const { ok, dados } = await api('/api/vendedores/eu/senha', {
      metodo: 'PUT',
      corpo: { senhaAtual: form.senhaAtual, novaSenha: form.novaSenha },
    })
    if (!ok) {
      setSalvando(false)
      setErros(dados?.campos || {})
      setAviso({ tipo: 'erro', texto: dados?.erro || 'Não foi possível trocar a senha.' })
      return
    }
    // A troca encerra as sessões antigas: entramos de novo com a nova senha, sem a pessoa perceber
    try {
      await entrar(vendedor.login, form.novaSenha)
      setAviso({ tipo: 'sucesso', texto: 'Senha alterada. Outras sessões abertas foram encerradas.' })
    } catch {
      setAviso({ tipo: 'sucesso', texto: 'Senha alterada. Entre novamente com a nova senha.' })
    }
    setForm({ senhaAtual: '', novaSenha: '', confirmar: '' })
    setSalvando(false)
  }

  const preenchido = form.senhaAtual && form.novaSenha && form.confirmar

  return (
    <form className="cartao" onSubmit={salvar} noValidate>
      <h2 className="cartao__titulo">Trocar senha</h2>
      <p className="cartao__descricao">Ao trocar, você continua conectado aqui e as outras sessões são encerradas.</p>

      <div className="grade-campos">
        <div className="largo">
          <Campo
            rotulo="Senha atual"
            tipo="password"
            valor={form.senhaAtual}
            aoMudar={alterar('senhaAtual')}
            erro={erros.senhaAtual}
            autoComplete="current-password"
          />
        </div>
        <Campo
          rotulo="Nova senha"
          tipo="password"
          valor={form.novaSenha}
          aoMudar={alterar('novaSenha')}
          erro={erros.novaSenha}
          dica="Mínimo de 8 caracteres."
          autoComplete="new-password"
        />
        <Campo
          rotulo="Confirmar nova senha"
          tipo="password"
          valor={form.confirmar}
          aoMudar={alterar('confirmar')}
          erro={erros.confirmar}
          autoComplete="new-password"
        />
      </div>

      {aviso && (
        <p className={`aviso aviso--${aviso.tipo}`} role={aviso.tipo === 'erro' ? 'alert' : 'status'} style={{ marginTop: 16 }}>
          {aviso.texto}
        </p>
      )}

      <div className="acoes-form">
        <button type="submit" className="botao" disabled={!preenchido || salvando}>
          {salvando ? 'Alterando…' : 'Alterar senha'}
        </button>
      </div>
    </form>
  )
}

export default function Perfil() {
  return (
    <PaginaVendedor titulo="Meu perfil" descricao="Seus dados de acesso e contato.">
      <DadosPessoais />
      <TrocarSenha />
    </PaginaVendedor>
  )
}
