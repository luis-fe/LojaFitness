'use client'

import { useState } from 'react'
import PaginaVendedor from '@/components/PaginaVendedor'
import Campo from '@/components/Campo'
import { useAutenticacao } from '@/context/Autenticacao'
import { useErro } from '@/context/Erro'

function TrocarSenha() {
  const { mostrarErro } = useErro()
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
      if (!dados?.campos) mostrarErro(dados?.erro || 'Não foi possível trocar a senha.')
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
    <PaginaVendedor titulo="Alterar perfil" trilha={[{ href: '/area-do-vendedor/perfil', rotulo: 'Perfil' }]}>
      <TrocarSenha />
    </PaginaVendedor>
  )
}
