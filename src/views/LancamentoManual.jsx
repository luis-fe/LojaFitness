'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import './Cadastros.css'
import '@/components/Formulario.css'
import './LancamentoManual.css'
import PaginaVendedor from '@/components/PaginaVendedor'
import DadosCliente from '@/components/DadosCliente'
import { useAutenticacao } from '@/context/Autenticacao'
import { useErro } from '@/context/Erro'
import { formatarPreco } from '@/lib/produtos'
import { mascaraCpfCnpj } from '@/lib/formatos'
import { validarCliente } from '@/lib/cliente'

const TRILHA = [{ href: '/area-do-vendedor/registro-de-vendas', rotulo: 'Registro de Vendas' }]
const CLIENTE_VAZIO = { nome: '', cpf_cnpj: '', cep: '', bairro: '', cidade: '', estado: '' }
const precoParaCampo = (v) => Number(v ?? 0).toFixed(2).replace('.', ',')
const lerPreco = (t) => Number(String(t).replace(/\./g, '').replace(',', '.'))
const mascaraPreco = (v) => v.replace(/[^\d,]/g, '').replace(/,(?=.*,)/g, '').replace(/(,\d{2})\d+$/, '$1')
let proximoId = 1
const novaLinha = () => ({ id: proximoId++, codigo: '', tamanho: '', cor: '', quant: '1', preco: '' })

// Venda feita fora do site (loja física, feira, Instagram…): gravada já como Paga
export default function LancamentoManual() {
  const { api } = useAutenticacao()
  const { mostrarErro } = useErro()
  const router = useRouter()
  const [produtos, setProdutos] = useState(null)
  const [cliente, setCliente] = useState(CLIENTE_VAZIO)
  const [linhas, setLinhas] = useState(() => [novaLinha()])
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    api('/api/vendas/produtos').then(({ ok, dados }) => {
      if (ok) setProdutos(dados.produtos)
      else {
        setProdutos([])
        mostrarErro(dados?.erro || 'Não foi possível carregar os produtos.')
      }
    })
  }, [api, mostrarErro])

  const porCodigo = useMemo(() => Object.fromEntries((produtos ?? []).map((p) => [p.codigo, p])), [produtos])
  const mudar = (id, campos) => setLinhas((ls) => ls.map((l) => (l.id === id ? { ...l, ...campos } : l)))

  // tamanhos do produto (na sequência) e cores que existem para o tamanho escolhido
  const tamanhosDe = (codigo) => {
    const vistos = new Map()
    for (const v of porCodigo[codigo]?.variacoes ?? []) if (!vistos.has(v.tamanho)) vistos.set(v.tamanho, v.sequencia)
    return [...vistos.entries()].sort((a, b) => a[1] - b[1]).map(([t]) => t)
  }
  const coresDe = (codigo, tamanho) => (porCodigo[codigo]?.variacoes ?? []).filter((v) => v.tamanho === tamanho)

  const escolherProduto = (l, codigo) => mudar(l.id, { codigo, tamanho: '', cor: '', preco: codigo ? precoParaCampo(porCodigo[codigo]?.preco_atual) : '' })
  const escolherTamanho = (l, tamanho) => {
    const cores = coresDe(l.codigo, tamanho)
    mudar(l.id, { tamanho, cor: cores.length === 1 ? cores[0].cor : '' })
  }

  const estoqueDe = (l) => coresDe(l.codigo, l.tamanho).find((c) => c.cor === l.cor)?.estoque ?? 0
  // mesma variação não se repete (o servidor recusa), então o limite é o estoque da linha
  const semEstoque = (l) => l.cor && Number(l.quant) > estoqueDe(l)
  const linhaValida = (l) => l.codigo && l.tamanho && l.cor && Number.isInteger(Number(l.quant)) && Number(l.quant) >= 1 && !semEstoque(l) && lerPreco(l.preco) >= 0 && l.preco !== ''
  const total = linhas.reduce((s, l) => s + (linhaValida(l) ? Number(l.quant) * lerPreco(l.preco) : 0), 0)
  const pecas = linhas.reduce((s, l) => s + (linhaValida(l) ? Number(l.quant) : 0), 0)
  const documento = cliente.cpf_cnpj.replace(/\D/g, '')
  const clienteOk = Object.keys(validarCliente(cliente).erros).length === 0 && (documento.length === 11 || documento.length === 14)
  const podeSalvar = clienteOk && linhas.length > 0 && linhas.every(linhaValida) && !salvando

  const salvar = async (e) => {
    e.preventDefault()
    setSalvando(true)
    const { ok, dados } = await api('/api/vendas/manual', {
      metodo: 'POST',
      corpo: {
        cliente,
        itens: linhas.map((l) => ({ codigo: l.codigo, tamanho: l.tamanho, cor: l.cor, quant: Number(l.quant), preco: lerPreco(l.preco) })),
      },
    })
    setSalvando(false)
    if (!ok) return mostrarErro(dados?.erros || (dados?.campos ? Object.values(dados.campos) : null) || dados?.erro || 'Não foi possível salvar a venda.')
    setAviso(`Venda ${dados.pedido.codigo} lançada como paga — total ${formatarPreco(Number(dados.pedido.total))}.`)
    setCliente(CLIENTE_VAZIO)
    setLinhas([novaLinha()])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <PaginaVendedor titulo="Lançamento Manual" trilha={TRILHA} largura={1000}>
      <div aria-live="polite">
        {aviso && (
          <p className="aviso aviso--sucesso cadastro__aviso">
            {aviso} <Link href="/area-do-vendedor/historico-vendas">Ver no histórico</Link>
          </p>
        )}
      </div>

      <form className="lancamento" onSubmit={salvar} noValidate>
        <DadosCliente
          cliente={cliente}
          setCliente={setCliente}
          idBase="manual-cliente"
          legenda="Cliente"
          extras={
            <div className="campo dados-cliente__largo">
              <label htmlFor="manual-cliente-cnpj">CNPJ (ou CPF)</label>
              <input
                id="manual-cliente-cnpj"
                value={cliente.cpf_cnpj}
                onChange={(e) => setCliente((c) => ({ ...c, cpf_cnpj: mascaraCpfCnpj(e.target.value) }))}
                inputMode="numeric"
                placeholder="00.000.000/0000-00"
              />
            </div>
          }
        />

        <fieldset className="lancamento__produtos">
          <legend>Produtos</legend>
          {!produtos ? (
            <div className="lancamento__carregando" aria-busy="true" aria-label="Carregando produtos" />
          ) : (
            <ol className="lancamento__linhas">
              {linhas.map((l, n) => {
                const tamanhos = tamanhosDe(l.codigo)
                const cores = coresDe(l.codigo, l.tamanho)
                const sub = linhaValida(l) ? Number(l.quant) * lerPreco(l.preco) : null
                return (
                  <li key={l.id} className="lancamento__linha">
                    <div className="campo lancamento__produto">
                      <label htmlFor={`lin-${l.id}-produto`}>Produto {n + 1}</label>
                      <select id={`lin-${l.id}-produto`} value={l.codigo} onChange={(e) => escolherProduto(l, e.target.value)}>
                        <option value="">Escolha…</option>
                        {produtos.map((p) => (
                          <option key={p.codigo} value={p.codigo} disabled={!p.variacoes.length}>
                            {p.nome}
                            {p.ativo ? '' : ' (oculto na loja)'}
                            {p.variacoes.length ? '' : ' — sem variações'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="campo">
                      <label htmlFor={`lin-${l.id}-tam`}>Tam.</label>
                      <select id={`lin-${l.id}-tam`} value={l.tamanho} disabled={!l.codigo} onChange={(e) => escolherTamanho(l, e.target.value)}>
                        <option value="">—</option>
                        {tamanhos.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="campo">
                      <label htmlFor={`lin-${l.id}-cor`}>Cor</label>
                      <select id={`lin-${l.id}-cor`} value={l.cor} disabled={!l.tamanho} onChange={(e) => mudar(l.id, { cor: e.target.value })}>
                        <option value="">—</option>
                        {cores.map((c) => (
                          <option key={c.cor} value={c.cor}>
                            {c.corNome} ({c.estoque} em estoque)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="campo">
                      <label htmlFor={`lin-${l.id}-qtd`}>Qtd.</label>
                      <input
                        id={`lin-${l.id}-qtd`}
                        type="number"
                        min={1}
                        max={l.cor ? estoqueDe(l) : 9999}
                        value={l.quant}
                        onChange={(e) => mudar(l.id, { quant: e.target.value })}
                        aria-invalid={semEstoque(l) || undefined}
                      />
                      {semEstoque(l) && <span className="campo__erro">Estoque: {estoqueDe(l)}</span>}
                    </div>
                    <div className="campo">
                      <label htmlFor={`lin-${l.id}-preco`}>Preço unit. (R$)</label>
                      <input id={`lin-${l.id}-preco`} inputMode="decimal" value={l.preco} onChange={(e) => mudar(l.id, { preco: mascaraPreco(e.target.value) })} placeholder="0,00" />
                    </div>
                    <div className="lancamento__sub">
                      <span>Subtotal</span>
                      <strong>{sub === null ? '—' : formatarPreco(sub)}</strong>
                    </div>
                    <button type="button" className="lancamento__remover" onClick={() => setLinhas((ls) => ls.filter((x) => x.id !== l.id))} disabled={linhas.length === 1} aria-label={`Remover produto ${n + 1}`}>
                      ✕
                    </button>
                  </li>
                )
              })}
            </ol>
          )}
          <button type="button" className="botao botao--secundario botao--pequeno" onClick={() => setLinhas((ls) => [...ls, novaLinha()])} disabled={!produtos || linhas.length >= 100}>
            + Adicionar produto
          </button>
        </fieldset>

        <div className="lancamento__total">
          <span>
            {pecas} {pecas === 1 ? 'peça' : 'peças'}
          </span>
          <strong>Total {formatarPreco(total)}</strong>
        </div>

        <div className="acoes-form">
          <button type="button" className="botao botao--secundario" onClick={() => router.push('/area-do-vendedor/registro-de-vendas')} disabled={salvando}>
            Cancelar
          </button>
          <button type="submit" className="botao botao--verde" disabled={!podeSalvar}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
        {!podeSalvar && !salvando && <p className="campo__dica lancamento__dica">Preencha o cliente (nome, CNPJ/CPF e CEP) e escolha produto, tamanho, cor e quantidade (até o estoque) em todas as linhas para salvar.</p>}
        <p className="campo__dica lancamento__dica">Ao salvar, as quantidades saem do estoque das variações.</p>
      </form>
    </PaginaVendedor>
  )
}
