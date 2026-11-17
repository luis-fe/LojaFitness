'use client'

import { useEffect, useState } from 'react'
import PaginaVendedor from '@/components/PaginaVendedor'
import Campo from '@/components/Campo'
import { useAutenticacao } from '@/context/Autenticacao'
import { useErro } from '@/context/Erro'
import { formatarCpfCnpj, formatarTelefone, mascaraCpfCnpj, mascaraTelefone } from '@/lib/formatos'
import { formatarCep, lerCoordenadas, mascaraCep } from '@/lib/retirada'

const VAZIO = {
  cnpj: '',
  razao_social: '',
  administrador: '',
  cep: '',
  email: '',
  localizacao_coordenada: '',
  e_mei: false,
  contato: '',
}

// Dados do banco → valores exibidos no formulário (com máscara)
const paraFormulario = (e) =>
  e
    ? {
        cnpj: formatarCpfCnpj(e.cnpj),
        razao_social: e.razao_social ?? '',
        administrador: e.administrador ?? '',
        cep: formatarCep(e.cep),
        email: e.email ?? '',
        localizacao_coordenada: e.localizacao_coordenada ? e.localizacao_coordenada.replace(',', ', ') : '',
        e_mei: Boolean(e.e_mei),
        contato: formatarTelefone(e.contato),
      }
    : VAZIO

export default function MinhaEmpresa() {
  const { api, vendedor } = useAutenticacao()
  const { mostrarErro } = useErro()
  const ehAdmin = vendedor?.papel === 'admin'

  const [form, setForm] = useState(VAZIO)
  const [erros, setErros] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    let ativo = true
    ;(async () => {
      const { ok, dados } = await api('/api/empresa')
      if (!ativo) return
      if (ok) setForm(paraFormulario(dados?.empresa))
      else mostrarErro(dados?.erro || 'Não foi possível carregar os dados da empresa.')
      setCarregando(false)
    })()
    return () => {
      ativo = false
    }
  }, [api, mostrarErro])

  const alterar = (campo) => (valor) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErros((e) => ({ ...e, [campo]: undefined }))
    setAviso('')
  }

  const salvar = async (e) => {
    e.preventDefault()
    setSalvando(true)
    const { ok, dados } = await api('/api/empresa', { metodo: 'PUT', corpo: form })
    setSalvando(false)
    if (!ok) {
      setErros(dados?.campos || {})
      if (!dados?.campos) mostrarErro(dados?.erro || 'Não foi possível salvar os dados da empresa.')
      return
    }
    setForm(paraFormulario(dados.empresa))
    setAviso('Dados da empresa salvos.')
  }

  const coordenadas = lerCoordenadas(form.localizacao_coordenada)
  const somenteLeitura = !ehAdmin

  return (
    <PaginaVendedor titulo="Minha Empresa" trilha={[{ href: '/area-do-vendedor/perfil', rotulo: 'Perfil' }]}>
      {carregando ? (
        <div className="lista-carregando" aria-busy="true" aria-label="Carregando dados da empresa" />
      ) : (
        <form className="cartao" onSubmit={salvar} noValidate>
          <h2 className="cartao__titulo">Dados da empresa</h2>
          <p className="cartao__descricao">
            {ehAdmin ? 'Informações cadastrais da empresa dona da loja.' : 'Somente administradores podem alterar estes dados.'}
          </p>

          <fieldset disabled={somenteLeitura} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <div className="grade-campos">
              <Campo
                rotulo="CNPJ"
                valor={form.cnpj}
                aoMudar={alterar('cnpj')}
                mascara={mascaraCpfCnpj}
                erro={erros.cnpj}
                inputMode="numeric"
                placeholder="00.000.000/0000-00"
              />
              <Campo rotulo="Razão social" valor={form.razao_social} aoMudar={alterar('razao_social')} erro={erros.razao_social} />
              <Campo rotulo="Administrador" opcional valor={form.administrador} aoMudar={alterar('administrador')} erro={erros.administrador} />
              <Campo
                rotulo="Contato"
                opcional
                valor={form.contato}
                aoMudar={alterar('contato')}
                mascara={mascaraTelefone}
                erro={erros.contato}
                inputMode="tel"
                placeholder="(62) 98765-4321"
              />
              <Campo rotulo="E-mail" opcional tipo="email" valor={form.email} aoMudar={alterar('email')} erro={erros.email} autoComplete="email" />
              <Campo
                rotulo="CEP"
                opcional
                valor={form.cep}
                aoMudar={alterar('cep')}
                mascara={mascaraCep}
                erro={erros.cep}
                inputMode="numeric"
                placeholder="00000-000"
              />
              <div className="largo">
                <Campo
                  rotulo="Localização (coordenadas)"
                  opcional
                  valor={form.localizacao_coordenada}
                  aoMudar={alterar('localizacao_coordenada')}
                  erro={erros.localizacao_coordenada}
                  dica={
                    coordenadas ? (
                      <a href={`https://www.google.com/maps?q=${coordenadas.lat},${coordenadas.lng}`} target="_blank" rel="noopener noreferrer">
                        Ver no Google Maps
                      </a>
                    ) : (
                      'Latitude, longitude — ex.: -16.8233, -49.2439 (no Google Maps, clique com o botão direito no local).'
                    )
                  }
                  placeholder="-16.8233, -49.2439"
                />
              </div>
              <div className="largo">
                <label className="opcao">
                  <input type="checkbox" checked={form.e_mei} onChange={(e) => alterar('e_mei')(e.target.checked)} />
                  Empresa é MEI (Microempreendedor Individual)
                </label>
              </div>
            </div>
          </fieldset>

          {aviso && (
            <p className="aviso aviso--sucesso" role="status" style={{ marginTop: 16 }}>
              {aviso}
            </p>
          )}

          {ehAdmin && (
            <div className="acoes-form">
              <button type="submit" className="botao" disabled={salvando || !form.cnpj || !form.razao_social}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          )}
        </form>
      )}
    </PaginaVendedor>
  )
}
