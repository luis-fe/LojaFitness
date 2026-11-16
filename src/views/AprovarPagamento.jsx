'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import './Cadastros.css'
import './AprovarPagamento.css'
import PaginaVendedor from '@/components/PaginaVendedor'
import ListaDados from '@/components/ListaDados'
import Modal from '@/components/Modal'
import ConfirmarExclusao from '@/components/ConfirmarExclusao'
import { useAutenticacao } from '@/context/Autenticacao'
import { useErro } from '@/context/Erro'
import { AmostraCor } from '@/views/Cores'
import { formatarDataHora } from '@/lib/formatos'
import { formatarPreco } from '@/lib/produtos'
import { formatarCep } from '@/lib/cliente'

const TRILHA = [{ href: '/area-do-vendedor/registro-de-vendas', rotulo: 'Registro de Vendas' }]
const precoParaCampo = (v) => Number(v).toFixed(2).replace('.', ',')
const lerPreco = (t) => Number(String(t).replace(/\./g, '').replace(',', '.'))
const mascaraPreco = (v) => v.replace(/[^\d,]/g, '').replace(/,(?=.*,)/g, '').replace(/(,\d{2})\d+$/, '$1')

// ---------------------------------------------------------------------------
// Extrato do pedido por SKU: editar preço e quantidade, excluir SKU e efetivar
// ---------------------------------------------------------------------------
function Extrato({ idPedido, aoAprovar, aoCancelar }) {
  const { api } = useAutenticacao()
  const { mostrarErro } = useErro()
  const [pedido, setPedido] = useState(null)
  const [linhas, setLinhas] = useState([]) // { id, ..., quant (texto), preco (texto), excluida }
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    api(`/api/vendas/${idPedido}`).then(({ ok, dados }) => {
      if (!ok) {
        aoCancelar()
        mostrarErro(dados?.erro || 'Não foi possível abrir o pedido.')
        return
      }
      setPedido(dados.pedido)
      setLinhas(dados.pedido.linhas.map((l) => ({ ...l, quant: String(l.quant), preco: precoParaCampo(l.preco), excluida: false })))
    })
  }, [api, idPedido]) // eslint-disable-line react-hooks/exhaustive-deps

  const mudar = (id, campo, valor) => setLinhas((ls) => ls.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)))

  const validas = linhas.filter((l) => !l.excluida)
  const invalida = (l) => !(Number.isInteger(Number(l.quant)) && Number(l.quant) >= 1 && Number(l.quant) <= 9999) || !(lerPreco(l.preco) >= 0)
  const pecas = validas.reduce((s, l) => s + (Number(l.quant) || 0), 0)
  const total = validas.reduce((s, l) => s + (invalida(l) ? 0 : Number(l.quant) * lerPreco(l.preco)), 0)
  const podeEfetivar = validas.length > 0 && !validas.some(invalida) && !salvando

  const efetivar = async () => {
    setSalvando(true)
    const { ok, dados } = await api(`/api/vendas/${idPedido}/aprovar`, {
      metodo: 'POST',
      corpo: { linhas: validas.map((l) => ({ id: l.id, quant: Number(l.quant), preco: lerPreco(l.preco) })) },
    })
    setSalvando(false)
    if (ok) return aoAprovar(dados.pedido)
    mostrarErro(dados?.erros || dados?.erro || 'Não foi possível aprovar o pagamento.')
  }

  if (!pedido) return <div className="extrato__carregando" aria-busy="true" aria-label="Carregando extrato" />

  return (
    <div className="extrato">
      <dl className="extrato__cliente">
        <div>
          <dt>Cliente</dt>
          <dd>{pedido.cliente_nome}</dd>
        </div>
        <div>
          <dt>Entrega</dt>
          <dd>
            {pedido.bairro}, {pedido.cidade} - {pedido.estado} · CEP {formatarCep(pedido.cliente_cep)}
          </dd>
        </div>
        <div>
          <dt>Emitido em</dt>
          <dd>{formatarDataHora(pedido.data_emissao)}</dd>
        </div>
      </dl>

      <table className="extrato__tabela">
        <caption className="sr-only">Itens do pedido por SKU</caption>
        <thead>
          <tr>
            <th scope="col">Produto / SKU</th>
            <th scope="col">Cor</th>
            <th scope="col">Tam.</th>
            <th scope="col">Quantidade</th>
            <th scope="col">Preço unit. (R$)</th>
            <th scope="col" className="extrato__num">
              Subtotal
            </th>
            <th scope="col">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => {
            const erro = !l.excluida && invalida(l)
            return (
              <tr key={l.id} className={l.excluida ? 'is-excluida' : ''}>
                <td data-rotulo="Produto / SKU">
                  <strong>{l.produto_nome || l.codigo_produto}</strong>
                  <code>{l.sku}</code>
                </td>
                <td data-rotulo="Cor">
                  <span className="extrato__cor">
                    {l.rgb && <AmostraCor rgb={l.rgb} tamanho={14} />} {l.cor_nome || l.cor}
                  </span>
                </td>
                <td data-rotulo="Tamanho">{l.tam}</td>
                <td data-rotulo="Quantidade">
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={l.quant}
                    disabled={l.excluida}
                    onChange={(e) => mudar(l.id, 'quant', e.target.value)}
                    aria-label={`Quantidade de ${l.sku}`}
                    aria-invalid={erro || undefined}
                  />
                </td>
                <td data-rotulo="Preço unit. (R$)">
                  <input
                    inputMode="decimal"
                    value={l.preco}
                    disabled={l.excluida}
                    onChange={(e) => mudar(l.id, 'preco', mascaraPreco(e.target.value))}
                    aria-label={`Preço de ${l.sku}`}
                    aria-invalid={erro || undefined}
                  />
                </td>
                <td data-rotulo="Subtotal" className="extrato__num">
                  {l.excluida ? 'excluído' : erro ? '—' : formatarPreco(Number(l.quant) * lerPreco(l.preco))}
                </td>
                <td className="extrato__acao">
                  {l.excluida ? (
                    <button type="button" className="lista-acao" onClick={() => mudar(l.id, 'excluida', false)}>
                      Restaurar
                    </button>
                  ) : (
                    <button type="button" className="lista-acao is-perigo" onClick={() => mudar(l.id, 'excluida', true)} aria-label={`Excluir ${l.sku}`}>
                      Excluir
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="extrato__rodape">
        <p className="extrato__total">
          <span>
            {validas.length} SKU{validas.length === 1 ? '' : 's'} · {pecas} {pecas === 1 ? 'peça' : 'peças'}
          </span>
          <strong>Total {formatarPreco(total)}</strong>
        </p>
        {validas.length === 0 && <p className="campo__erro">Mantenha pelo menos 1 SKU para aprovar o pedido.</p>}
        <div className="acoes-form">
          <button type="button" className="botao botao--secundario" onClick={aoCancelar} disabled={salvando}>
            Cancelar
          </button>
          <button type="button" className="botao botao--verde" onClick={efetivar} disabled={!podeEfetivar}>
            {salvando ? 'Aprovando…' : 'Efetivar e aprovar pagamento'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tela: pedidos em rascunho
// ---------------------------------------------------------------------------
export default function AprovarPagamento() {
  const { api } = useAutenticacao()
  const { mostrarErro } = useErro()
  const [pedidos, setPedidos] = useState(null)
  const [aviso, setAviso] = useState('')
  const [aberto, setAberto] = useState(null) // { id, codigo }
  const [excluindo, setExcluindo] = useState(null) // pedido a excluir
  const [busca, setBusca] = useState('')

  const carregar = useCallback(async () => {
    const { ok, dados } = await api('/api/vendas/rascunhos')
    if (ok) setPedidos(dados.pedidos)
    else {
      setPedidos([])
      mostrarErro(dados?.erro || 'Não foi possível carregar os pedidos.')
    }
  }, [api, mostrarErro])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    if (!aviso) return
    const id = setTimeout(() => setAviso(''), 6000)
    return () => clearTimeout(id)
  }, [aviso])

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!pedidos || !t) return pedidos
    return pedidos.filter((p) => `${p.codigo} ${p.cliente_nome} ${p.cidade} ${p.cliente_cep}`.toLowerCase().includes(t))
  }, [pedidos, busca])

  return (
    <PaginaVendedor titulo="Aprovar Pagamento" trilha={TRILHA} largura={1100} fixarTopo>
      <div aria-live="polite">{aviso && <p className="aviso aviso--sucesso cadastro__aviso">{aviso}</p>}</div>

      {pedidos && pedidos.length > 0 && (
        <div className="campo cadastro__busca">
          <label htmlFor="busca-pedidos" className="sr-only">
            Buscar pedidos
          </label>
          <input id="busca-pedidos" type="search" placeholder="Buscar por pedido, cliente, cidade ou CEP" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
      )}

      {!pedidos ? (
        <div className="cadastro__carregando" aria-busy="true" aria-label="Carregando pedidos" />
      ) : (
        <ListaDados
          rotulo="Pedidos em rascunho"
          itens={filtrados}
          chave={(p) => p.id_pedido}
          ordemInicial={{ coluna: 'data', direcao: 'desc' }}
          vazio={busca ? `Nenhum pedido encontrado para “${busca}”.` : 'Nenhum pedido aguardando aprovação.'}
          colunas={[
            { id: 'codigo', titulo: 'Pedido', valor: (p) => p.codigo, destaque: true, letraALetra: true },
            { id: 'data', titulo: 'Emitido em', valor: (p) => new Date(p.data_emissao).getTime(), exibir: (p) => formatarDataHora(p.data_emissao) },
            { id: 'cliente', titulo: 'Cliente', valor: (p) => p.cliente_nome },
            { id: 'cidade', titulo: 'Cidade', valor: (p) => `${p.cidade} - ${p.estado}` },
            { id: 'pecas', titulo: 'Peças', valor: (p) => p.pecas, exibir: (p) => `${p.pecas} (${p.skus} SKU${p.skus === 1 ? '' : 's'})`, alinhar: 'direita' },
            { id: 'total', titulo: 'Total', valor: (p) => Number(p.total), exibir: (p) => formatarPreco(Number(p.total)), alinhar: 'direita' },
          ]}
          acoes={(p) => (
            <span className="pedido-acoes">
              <button type="button" className="botao botao--compacto botao--verde" onClick={() => setAberto({ id: p.id_pedido, codigo: p.codigo })}>
                Aprovar pagamento
              </button>
              <button type="button" className="lista-acao is-perigo" onClick={() => setExcluindo(p)}>
                Excluir rascunho
              </button>
            </span>
          )}
        />
      )}

      <Modal aberto={Boolean(excluindo)} aoFechar={() => setExcluindo(null)} titulo="Excluir rascunho?" largura={480}>
        {excluindo && (
          <ConfirmarExclusao
            mensagem={`O pedido ${excluindo.codigo} de ${excluindo.cliente_nome} (${formatarPreco(Number(excluindo.total))}) será apagado do banco, com os ${excluindo.skus} SKU(s). Esta ação não pode ser desfeita.`}
            rotuloBotao="Excluir rascunho"
            aoConfirmar={() => api(`/api/vendas/${excluindo.id_pedido}`, { metodo: 'DELETE' })}
            aoConcluir={() => {
              setAviso(`Rascunho ${excluindo.codigo} excluído.`)
              setExcluindo(null)
              carregar()
            }}
            aoCancelar={() => setExcluindo(null)}
          />
        )}
      </Modal>

      <Modal aberto={Boolean(aberto)} aoFechar={() => setAberto(null)} titulo={aberto ? `Extrato do pedido ${aberto.codigo}` : ''} largura={960}>
        {aberto && (
          <Extrato
            key={aberto.id}
            idPedido={aberto.id}
            aoCancelar={() => setAberto(null)}
            aoAprovar={(p) => {
              setAberto(null)
              setAviso(`Pagamento do pedido ${p.codigo} aprovado — total ${formatarPreco(Number(p.total))}.`)
              carregar()
            }}
          />
        )}
      </Modal>
    </PaginaVendedor>
  )
}
