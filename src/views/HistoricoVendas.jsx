'use client'

import { useCallback, useEffect, useState } from 'react'
import './Cadastros.css'
import '@/components/Formulario.css'
import './HistoricoVendas.css'
import PaginaVendedor from '@/components/PaginaVendedor'
import ListaDados from '@/components/ListaDados'
import Modal from '@/components/Modal'
import { useAutenticacao } from '@/context/Autenticacao'
import { useErro } from '@/context/Erro'
import { AmostraCor } from '@/views/Cores'
import { formatarCpfCnpj, formatarDataHora } from '@/lib/formatos'
import { formatarPreco } from '@/lib/produtos'
import { formatarCep } from '@/lib/cliente'

const TRILHA = [{ href: '/area-do-vendedor/registro-de-vendas', rotulo: 'Registro de Vendas' }]

// AAAA-MM-DD no fuso do navegador
const dia = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const PERIODOS = [
  ['hoje', 'Hoje', () => [dia(new Date()), dia(new Date())]],
  ['7dias', '7 dias', () => [dia(new Date(Date.now() - 6 * 864e5)), dia(new Date())]],
  ['mes', 'Este mês', () => {
    const h = new Date()
    return [dia(new Date(h.getFullYear(), h.getMonth(), 1)), dia(h)]
  }],
  ['tudo', 'Tudo', () => ['', '']],
]

// Extrato (só leitura) de uma venda
function ExtratoVenda({ id }) {
  const { api } = useAutenticacao()
  const [pedido, setPedido] = useState(null)
  useEffect(() => {
    api(`/api/vendas/${id}`).then(({ ok, dados }) => ok && setPedido(dados.pedido))
  }, [api, id])
  if (!pedido) return <div className="historico__carregando" aria-busy="true" />
  return (
    <div>
      <dl className="historico__cliente">
        <div>
          <dt>Cliente</dt>
          <dd>
            {pedido.cliente_nome}
            {pedido.cpf_cnpj && <small> · {formatarCpfCnpj(pedido.cpf_cnpj)}</small>}
          </dd>
        </div>
        <div>
          <dt>Entrega</dt>
          <dd>
            {pedido.bairro}, {pedido.cidade} - {pedido.estado} · CEP {formatarCep(pedido.cliente_cep)}
          </dd>
        </div>
        <div>
          <dt>Venda</dt>
          <dd>
            {formatarDataHora(pedido.aprovado_em ?? pedido.data_emissao)} · {pedido.origem === 'manual' ? 'Lançamento manual' : 'Site (WhatsApp)'}
            {pedido.aprovado_por && ` · por ${pedido.aprovado_por}`}
          </dd>
        </div>
      </dl>
      <table className="historico__itens">
        <thead>
          <tr>
            <th scope="col">Produto / SKU</th>
            <th scope="col">Tam.</th>
            <th scope="col">Cor</th>
            <th scope="col" className="historico__num">
              Qtd.
            </th>
            <th scope="col" className="historico__num">
              Preço
            </th>
            <th scope="col" className="historico__num">
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody>
          {pedido.linhas.map((l) => (
            <tr key={l.id}>
              <td>
                <strong>{l.produto_nome || l.codigo_produto}</strong>
                <code>{l.sku}</code>
              </td>
              <td>{l.tam}</td>
              <td>
                <span className="historico__cor">
                  {l.rgb && <AmostraCor rgb={l.rgb} tamanho={12} />} {l.cor_nome || l.cor}
                </span>
              </td>
              <td className="historico__num">{l.quant}</td>
              <td className="historico__num">{formatarPreco(Number(l.preco))}</td>
              <td className="historico__num">{formatarPreco(l.quant * Number(l.preco))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="historico__total-extrato">
        Total <strong>{formatarPreco(Number(pedido.total))}</strong>
      </p>
    </div>
  )
}

export default function HistoricoVendas() {
  const { api } = useAutenticacao()
  const { mostrarErro } = useErro()
  const [periodo, setPeriodo] = useState('mes')
  const [de, setDe] = useState(() => PERIODOS[2][2]()[0])
  const [ate, setAte] = useState(() => PERIODOS[2][2]()[1])
  const [cliente, setCliente] = useState('')
  const [clienteAplicado, setClienteAplicado] = useState('')
  const [dados, setDados] = useState(null)
  const [aberta, setAberta] = useState(null) // { id, codigo }

  // espera parar de digitar para buscar
  useEffect(() => {
    const id = setTimeout(() => setClienteAplicado(cliente.trim()), 350)
    return () => clearTimeout(id)
  }, [cliente])

  const carregar = useCallback(async () => {
    const q = new URLSearchParams()
    if (de) q.set('de', de)
    if (ate) q.set('ate', ate)
    if (clienteAplicado) q.set('cliente', clienteAplicado)
    const { ok, dados: d } = await api(`/api/vendas/historico?${q}`)
    if (ok) setDados(d)
    else mostrarErro(d?.erro || 'Não foi possível carregar o histórico.')
  }, [api, de, ate, clienteAplicado, mostrarErro])

  useEffect(() => {
    carregar()
  }, [carregar])

  const escolherPeriodo = (chave) => {
    const [, , calc] = PERIODOS.find((p) => p[0] === chave)
    const [d, a] = calc()
    setPeriodo(chave)
    setDe(d)
    setAte(a)
  }

  return (
    <PaginaVendedor titulo="Histórico de Vendas" trilha={TRILHA} largura={1100} fixarTopo>
      <div className="historico__filtros" role="search" aria-label="Filtrar vendas">
        <div className="historico__periodos" role="group" aria-label="Período">
          {PERIODOS.map(([chave, rotulo]) => (
            <button key={chave} type="button" aria-pressed={periodo === chave} onClick={() => escolherPeriodo(chave)}>
              {rotulo}
            </button>
          ))}
        </div>
        <div className="campo">
          <label htmlFor="hist-de">De</label>
          <input id="hist-de" type="date" value={de} max={ate || undefined} onChange={(e) => (setDe(e.target.value), setPeriodo(''))} />
        </div>
        <div className="campo">
          <label htmlFor="hist-ate">Até</label>
          <input id="hist-ate" type="date" value={ate} min={de || undefined} onChange={(e) => (setAte(e.target.value), setPeriodo(''))} />
        </div>
        <div className="campo historico__busca">
          <label htmlFor="hist-cliente">Cliente</label>
          <input id="hist-cliente" type="search" placeholder="Nome, CNPJ/CPF ou CEP" value={cliente} onChange={(e) => setCliente(e.target.value)} />
        </div>
      </div>

      {dados && (
        <dl className="historico__resumo">
          <div>
            <dt>Vendas</dt>
            <dd>{dados.resumo.quantidade}</dd>
          </div>
          <div>
            <dt>Peças</dt>
            <dd>{dados.resumo.pecas}</dd>
          </div>
          <div>
            <dt>Total vendido</dt>
            <dd>{formatarPreco(dados.resumo.total)}</dd>
          </div>
        </dl>
      )}

      {!dados ? (
        <div className="cadastro__carregando" aria-busy="true" aria-label="Carregando vendas" />
      ) : (
        <ListaDados
          rotulo="Vendas"
          itens={dados.vendas}
          chave={(v) => v.id_pedido}
          ordemInicial={{ coluna: 'data', direcao: 'desc' }}
          vazio={clienteAplicado || de || ate ? 'Nenhuma venda encontrada com esses filtros.' : 'Nenhuma venda registrada ainda.'}
          colunas={[
            { id: 'codigo', titulo: 'Pedido', valor: (v) => v.codigo, destaque: true, letraALetra: true },
            { id: 'data', titulo: 'Data', valor: (v) => new Date(v.data_venda).getTime(), exibir: (v) => formatarDataHora(v.data_venda) },
            {
              id: 'cliente',
              titulo: 'Cliente',
              valor: (v) => v.cliente_nome,
              exibir: (v) => (
                <span className="historico__nome">
                  {v.cliente_nome}
                  {v.cpf_cnpj && <small>{formatarCpfCnpj(v.cpf_cnpj)}</small>}
                </span>
              ),
            },
            { id: 'cidade', titulo: 'Cidade', valor: (v) => `${v.cidade} - ${v.estado}` },
            { id: 'origem', titulo: 'Origem', valor: (v) => v.origem, exibir: (v) => <span className={`historico__origem historico__origem--${v.origem}`}>{v.origem === 'manual' ? 'Manual' : 'Site'}</span> },
            { id: 'pecas', titulo: 'Peças', valor: (v) => v.pecas, alinhar: 'direita' },
            { id: 'total', titulo: 'Total', valor: (v) => Number(v.total), exibir: (v) => formatarPreco(Number(v.total)), alinhar: 'direita' },
          ]}
          acoes={(v) => (
            <button type="button" className="lista-acao" onClick={() => setAberta({ id: v.id_pedido, codigo: v.codigo })}>
              Ver itens
            </button>
          )}
        />
      )}

      <Modal aberto={Boolean(aberta)} aoFechar={() => setAberta(null)} titulo={aberta ? `Venda ${aberta.codigo}` : ''} largura={860}>
        {aberta && <ExtratoVenda key={aberta.id} id={aberta.id} />}
      </Modal>
    </PaginaVendedor>
  )
}
