'use client'

import { useEffect, useState } from 'react'
import './EnvioEtiqueta.css'
import { useAutenticacao } from '@/context/Autenticacao'
import { useErro } from '@/context/Erro'
import { formatarPreco } from '@/lib/produtos'
import { formatarDataHora } from '@/lib/formatos'

const SITUACAO = {
  pendente: { rotulo: 'Aguardando', classe: 'pendente' },
  gerando: { rotulo: 'Gerando…', classe: 'gerando' },
  gerada: { rotulo: 'Etiqueta gerada', classe: 'gerada' },
  erro: { rotulo: 'Erro', classe: 'erro' },
}

// Envio pelo Melhor Envio no extrato do pedido: serviço, situação da etiqueta, imprimir etiqueta e DC-e
//   modo: "pedido" (gera ao receber o pedido — testes) ou "aprovacao" (gera ao aprovar o pagamento)
export default function EnvioEtiqueta({ idPedido, envioInicial, modo }) {
  const { api } = useAutenticacao()
  const { mostrarErro } = useErro()
  const [envio, setEnvio] = useState(envioInicial)
  const [ocupado, setOcupado] = useState('')
  const [aviso, setAviso] = useState('')

  // Enquanto o Melhor Envio processa, confere de novo a cada 3 s
  useEffect(() => {
    if (envio?.situacao !== 'gerando') return
    const id = setInterval(async () => {
      const { ok, dados } = await api(`/api/vendas/${idPedido}`)
      if (ok && dados.pedido.envio) setEnvio(dados.pedido.envio)
    }, 3000)
    return () => clearInterval(id)
  }, [api, idPedido, envio?.situacao])

  if (!envio) return null
  const s = SITUACAO[envio.situacao] ?? SITUACAO.pendente

  const gerar = async () => {
    setOcupado('gerar')
    setAviso('')
    const { ok, dados } = await api(`/api/vendas/${idPedido}/etiqueta`, { metodo: 'POST' })
    setOcupado('')
    if (!ok) return mostrarErro(dados?.erro || 'Não foi possível gerar a etiqueta.')
    setEnvio(dados.envio)
    if (dados.envio.situacao === 'erro') mostrarErro(dados.envio.erro || 'O Melhor Envio não gerou a etiqueta.')
  }

  const imprimirDce = async () => {
    const aba = window.open('', '_blank') // abre já no clique (senão o navegador bloqueia)
    setOcupado('dce')
    setAviso('')
    const { ok, dados } = await api(`/api/vendas/${idPedido}/dace`)
    setOcupado('')
    if (!ok || !dados.urls?.length) {
      aba?.close()
      if (ok || dados?.erro?.includes('processada')) setAviso(dados?.erro || 'A DC-e ainda não está pronta. Tente de novo em alguns minutos.')
      else mostrarErro(dados?.erro || 'Não foi possível abrir a DC-e.')
      return
    }
    if (aba) aba.location.href = dados.urls[0]
    else window.location.href = dados.urls[0]
    dados.urls.slice(1).forEach((u) => window.open(u, '_blank'))
  }

  return (
    <section className="envio-etiqueta" aria-labelledby={`envio-${idPedido}`}>
      <header className="envio-etiqueta__topo">
        <h3 id={`envio-${idPedido}`}>Envio pelo Melhor Envio</h3>
        <span className={`envio-etiqueta__situacao is-${s.classe}`} role="status">
          {s.rotulo}
        </span>
      </header>

      <dl className="envio-etiqueta__dados">
        <div>
          <dt>Serviço</dt>
          <dd>{[envio.transportadora, envio.servico_nome].filter(Boolean).join(' ')}</dd>
        </div>
        <div>
          <dt>Frete</dt>
          <dd>
            {formatarPreco(envio.valor)}
            {envio.prazo_dias ? ` · até ${envio.prazo_dias} dias úteis` : ''}
          </dd>
        </div>
        {envio.me_protocolos?.length > 0 && (
          <div>
            <dt>Protocolo</dt>
            <dd>{envio.me_protocolos.join(', ')}</dd>
          </div>
        )}
        {envio.situacao === 'gerada' && (
          <div>
            <dt>DC-e</dt>
            <dd>{envio.dce ? 'Emitida (envio não comercial — empresa MEI)' : 'Não emitida'}</dd>
          </div>
        )}
        {envio.gerada_em && (
          <div>
            <dt>Gerada em</dt>
            <dd>{formatarDataHora(envio.gerada_em)}</dd>
          </div>
        )}
      </dl>

      {envio.situacao === 'erro' && envio.erro && <p className="envio-etiqueta__erro">{envio.erro}</p>}
      {aviso && (
        <p className="envio-etiqueta__aviso" role="status">
          {aviso}
        </p>
      )}

      <div className="envio-etiqueta__acoes">
        {envio.situacao === 'gerada' && envio.etiqueta_url && (
          <a className="botao botao--verde botao--compacto" href={envio.etiqueta_url} target="_blank" rel="noopener noreferrer">
            Imprimir etiqueta
          </a>
        )}
        {envio.situacao === 'gerada' && envio.dce && (
          <button type="button" className="botao botao--secundario botao--compacto" onClick={imprimirDce} disabled={ocupado === 'dce'}>
            {ocupado === 'dce' ? 'Abrindo…' : 'Imprimir DC-e (DACE)'}
          </button>
        )}
        {(envio.situacao === 'pendente' || envio.situacao === 'erro') && (
          <button type="button" className="botao botao--verde botao--compacto" onClick={gerar} disabled={ocupado === 'gerar'}>
            {ocupado === 'gerar' ? 'Gerando etiqueta…' : envio.situacao === 'erro' ? 'Tentar de novo' : 'Gerar etiqueta'}
          </button>
        )}
      </div>

      {modo === 'pedido' && (
        <p className="envio-etiqueta__nota">Modo de teste: a etiqueta é gerada assim que o cliente envia o pedido, sem esperar o pagamento.</p>
      )}
      {modo === 'aprovacao' && envio.situacao === 'pendente' && (
        <p className="envio-etiqueta__nota">A etiqueta é gerada ao aprovar o pagamento (ou agora, pelo botão acima).</p>
      )}
    </section>
  )
}
