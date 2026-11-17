'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import './Cadastros.css'
import './CadastroProdutos.css'
import { TIPO_SELO_PADRAO } from '@/lib/selos'
import PaginaVendedor from '@/components/PaginaVendedor'
import ListaDados from '@/components/ListaDados'
import Campo from '@/components/Campo'
import Modal from '@/components/Modal'
import ConfirmarExclusao from '@/components/ConfirmarExclusao'
import SeletorImagens from '@/components/SeletorImagens'
import { AmostraCor, FormCor } from '@/views/Cores'
import { FormTamanho } from '@/views/Tamanhos'
import { useAutenticacao } from '@/context/Autenticacao'
import { useErro } from '@/context/Erro'
import { formatarDataHora } from '@/lib/formatos'

const TRILHA = [{ href: '/area-do-vendedor/produtos', rotulo: 'Produtos' }]
const reais = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const precoParaCampo = (v) => (v === null || v === undefined ? '' : Number(v).toFixed(2).replace('.', ','))
const mascaraCodigo = (v) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s/g, '-')
    .replace(/[^A-Z0-9._-]/g, '')
    .slice(0, 60)
const mascaraPreco = (v) =>
  v
    .replace(/[^\d,]/g, '')
    .replace(/,(?=.*,)/g, '')
    .replace(/(,\d{2})\d+$/, '$1')
// Medidas com vírgula: "30,5" cm (2 casas) e "0,350" kg (3 casas)
const medidaParaCampo = (v) => (v === null || v === undefined ? '' : String(Number(v)).replace('.', ','))
const mascaraMedida = (casas) => (v) =>
  v
    .replace(/\./g, ',')
    .replace(/[^\d,]/g, '')
    .replace(/,(?=.*,)/g, '')
    .replace(new RegExp(`(,\\d{${casas}})\\d+$`), '$1')
const mascaraCm = mascaraMedida(2)
const mascaraKg = mascaraMedida(3)
const MEDIDAS = ['embalagem_x', 'embalagem_y', 'embalagem_z', 'peso_bruto', 'peso_liquido']

// ---------------------------------------------------------------------------
// Variações (produtos filho)
// ---------------------------------------------------------------------------
// gerador/marcadas ficam no formulário do produto para não se perderem ao cadastrar uma cor ou um tamanho
function Variacoes({ filhos, setFilhos, cores, tamanhos, erro, gerador, setGerador, marcadas, setMarcadas, aoNovo }) {
  const atualizar = (i, campo, v) => setFilhos(filhos.map((f, n) => (n === i ? { ...f, [campo]: v } : f)))
  const marcar = (grupo, codigo) => setMarcadas((m) => ({ ...m, [grupo]: m[grupo].includes(codigo) ? m[grupo].filter((c) => c !== codigo) : [...m[grupo], codigo] }))

  const gerar = () => {
    const existentes = new Set(filhos.map((f) => `${f.cor}|${f.tamanho}`))
    const novas = []
    for (const cor of marcadas.cores)
      for (const tamanho of tamanhos.map((t) => t.codigo).filter((t) => marcadas.tamanhos.includes(t))) {
        if (!existentes.has(`${cor}|${tamanho}`)) novas.push({ cor, tamanho, estoque: 0 })
      }
    setFilhos([...filhos, ...novas])
    setGerador(false)
    setMarcadas({ cores: [], tamanhos: [] })
  }

  const totalEstoque = filhos.reduce((s, f) => s + (Number(f.estoque) || 0), 0)

  return (
    <section className="secao-form" aria-labelledby="variacoes-titulo">
      <div className="secao-form__topo">
        <h3 id="variacoes-titulo">
          Variações{' '}
          <span>
            ({filhos.length} · {totalEstoque} peças)
          </span>
        </h3>
        <div className="secao-form__acoes">
          <button type="button" className="botao botao--secundario botao--pequeno" onClick={() => setGerador((g) => !g)} aria-expanded={gerador}>
            Gerar grade
          </button>
          <button type="button" className="botao botao--secundario botao--pequeno" onClick={() => setFilhos([...filhos, { cor: cores[0]?.codigo ?? '', tamanho: tamanhos[0]?.codigo ?? '', estoque: 0 }])}>
            + Variação
          </button>
        </div>
      </div>

      {gerador && (
        <div className="gerador">
          <p className="campo__dica">Marque as cores e os tamanhos: todas as combinações que ainda não existem são adicionadas com estoque 0.</p>
          <fieldset>
            <legend>
              Cores
              <button type="button" className="gerador__novo" onClick={() => aoNovo('cor')} aria-label="Cadastrar nova cor" title="Cadastrar nova cor">
                +
              </button>
            </legend>
            {cores.map((c) => (
              <label key={c.codigo} className="opcao">
                <input type="checkbox" checked={marcadas.cores.includes(c.codigo)} onChange={() => marcar('cores', c.codigo)} />
                <AmostraCor rgb={c.rgb} tamanho={16} /> {c.nome}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>
              Tamanhos
              <button type="button" className="gerador__novo" onClick={() => aoNovo('tamanho')} aria-label="Cadastrar novo tamanho" title="Cadastrar novo tamanho">
                +
              </button>
            </legend>
            {tamanhos.map((t) => (
              <label key={t.codigo} className="opcao">
                <input type="checkbox" checked={marcadas.tamanhos.includes(t.codigo)} onChange={() => marcar('tamanhos', t.codigo)} />
                {t.codigo}
              </label>
            ))}
          </fieldset>
          <button type="button" className="botao botao--pequeno" disabled={!marcadas.cores.length || !marcadas.tamanhos.length} onClick={gerar}>
            Adicionar {marcadas.cores.length * marcadas.tamanhos.length || ''} combinações
          </button>
        </div>
      )}

      {erro && (
        <p className="campo__erro" role="alert">
          {erro}
        </p>
      )}

      {filhos.length === 0 ? (
        <p className="variacoes__vazio">Nenhuma variação. Use “Gerar grade” ou “+ Variação”.</p>
      ) : (
        <table className="variacoes">
          <thead>
            <tr>
              <th scope="col">Cor</th>
              <th scope="col">Tamanho</th>
              <th scope="col">Estoque</th>
              <th scope="col">
                <span className="sr-only">Remover</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filhos.map((f, i) => {
              const cor = cores.find((c) => c.codigo === f.cor)
              return (
                <tr key={f.id ?? `novo-${i}`}>
                  <td>
                    <span className="variacoes__cor">
                      <AmostraCor rgb={cor?.rgb ?? 'transparent'} tamanho={18} />
                      <select aria-label={`Cor da variação ${i + 1}`} value={f.cor} onChange={(e) => atualizar(i, 'cor', e.target.value)}>
                        {cores.map((c) => (
                          <option key={c.codigo} value={c.codigo}>
                            {c.nome}
                          </option>
                        ))}
                      </select>
                    </span>
                  </td>
                  <td>
                    <select aria-label={`Tamanho da variação ${i + 1}`} value={f.tamanho} onChange={(e) => atualizar(i, 'tamanho', e.target.value)}>
                      {tamanhos.map((t) => (
                        <option key={t.codigo} value={t.codigo}>
                          {t.codigo} — {t.nome}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input type="number" min={0} step={1} aria-label={`Estoque da variação ${i + 1}`} value={f.estoque} onChange={(e) => atualizar(i, 'estoque', e.target.value === '' ? '' : Number(e.target.value))} />
                  </td>
                  <td>
                    <button type="button" className="variacoes__remover" onClick={() => setFilhos(filhos.filter((_, n) => n !== i))} aria-label={`Remover variação ${i + 1}`}>
                      ✕
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Formulário do produto
// ---------------------------------------------------------------------------
function FormProduto({ produto, cores, tamanhos, campanhas, selosExistentes = [], aoSalvar, aoCancelar, aoCriarApoio }) {
  const { api } = useAutenticacao()
  const [form, setForm] = useState({
    codigo: produto?.codigo ?? '',
    nome: produto?.nome ?? '',
    descricao: produto?.descricao ?? '',
    preco_atual: precoParaCampo(produto?.preco_atual),
    preco_anterior: precoParaCampo(produto?.preco_anterior),
    mostrar_preco_anterior: produto?.mostrar_preco_anterior ?? false,
    campanha_id: produto?.campanha_id ?? '',
    selo_campanha: produto?.selo_campanha ?? '',
    selo_tipo: produto?.selo_tipo ?? TIPO_SELO_PADRAO,
    caminho: produto?.caminho ?? null,
    ativo: produto?.ativo ?? true,
    ...Object.fromEntries(MEDIDAS.map((c) => [c, medidaParaCampo(produto?.[c])])),
  })
  const [filhos, setFilhos] = useState(() => (produto?.filhos ?? []).map(({ id, cor, tamanho, estoque }) => ({ id, cor, tamanho, estoque })))
  const [escolhendoImagem, setEscolhendoImagem] = useState(false)
  const [cadastrando, setCadastrando] = useState(null) // 'cor' | 'tamanho' — atalho do "+" na grade
  const [gerador, setGerador] = useState(false)
  const [marcadas, setMarcadas] = useState({ cores: [], tamanhos: [] })
  const [erros, setErros] = useState({})
  const { mostrarErro } = useErro()
  const [salvando, setSalvando] = useState(false)

  const alterar = (c) => (v) => {
    setForm((f) => ({ ...f, [c]: v }))
    setErros((e) => ({ ...e, [c]: undefined }))
  }

  const salvar = async (e) => {
    e.preventDefault()
    setSalvando(true)
    const corpo = {
      ...form,
      campanha_id: form.campanha_id === '' ? null : Number(form.campanha_id),
      selo_campanha: form.selo_campanha.trim() === '' ? null : form.selo_campanha,
      preco_anterior: form.preco_anterior === '' ? null : form.preco_anterior,
      ...Object.fromEntries(MEDIDAS.map((c) => [c, form[c] === '' ? null : form[c]])),
      filhos: filhos.map(({ cor, tamanho, estoque }) => ({ cor, tamanho, estoque: Number(estoque) || 0 })),
    }
    const { ok, dados } = produto ? await api(`/api/cadastro/produtos/${encodeURIComponent(produto.codigo)}`, { metodo: 'PATCH', corpo }) : await api('/api/cadastro/produtos', { metodo: 'POST', corpo })
    setSalvando(false)
    if (ok) return aoSalvar(dados.produto)
    setErros(dados?.campos || {})
    mostrarErro(dados?.erro || 'Não foi possível salvar.')
  }

  // A escolha da imagem acontece dentro da mesma janela (o formulário fica guardado)
  if (escolhendoImagem) {
    return (
      <div>
        <button type="button" className="link-voltar" onClick={() => setEscolhendoImagem(false)}>
          ← Voltar ao produto
        </button>
        <SeletorImagens
          aoCancelar={() => setEscolhendoImagem(false)}
          aoEscolher={(imgs) => {
            alterar('caminho')(imgs[0].url)
            setEscolhendoImagem(false)
          }}
        />
      </div>
    )
  }

  // Cor ou tamanho criado pelo atalho: entra na lista, já fica marcado na grade e volta ao produto
  const criado = (tipo, item) => {
    aoCriarApoio(tipo, item)
    const grupo = tipo === 'cor' ? 'cores' : 'tamanhos'
    setMarcadas((m) => ({ ...m, [grupo]: [...m[grupo], item.codigo] }))
    setCadastrando(null)
  }

  return (
    <>
      {cadastrando && (
        <div className="atalho-cadastro">
          <button type="button" className="link-voltar" onClick={() => setCadastrando(null)}>
            ← Voltar ao produto
          </button>
          <h3 className="atalho-cadastro__titulo">{cadastrando === 'cor' ? 'Nova cor' : 'Novo tamanho'}</h3>
          {cadastrando === 'cor' ? <FormCor aoSalvar={(c) => criado('cor', c)} aoCancelar={() => setCadastrando(null)} /> : <FormTamanho aoSalvar={(t) => criado('tamanho', t)} aoCancelar={() => setCadastrando(null)} />}
        </div>
      )}
      <form onSubmit={salvar} noValidate className="form-produto" hidden={Boolean(cadastrando)}>
        <section className="secao-form" aria-labelledby="dados-titulo">
          <h3 id="dados-titulo">Dados do produto</h3>
          <div className="form-produto__dados">
            <div className="form-produto__imagem">
              {form.caminho ? <img src={form.caminho} alt="" /> : <div className="form-produto__sem-imagem">Sem imagem</div>}
              <button type="button" className="botao botao--secundario botao--pequeno" onClick={() => setEscolhendoImagem(true)}>
                {form.caminho ? 'Trocar imagem' : 'Escolher imagem'}
              </button>
              {form.caminho && (
                <button type="button" className="link-voltar" onClick={() => alterar('caminho')(null)}>
                  Remover imagem
                </button>
              )}
              {erros.caminho && <span className="campo__erro">{erros.caminho}</span>}
            </div>
            <div className="grade-campos">
              <Campo rotulo="Código do produto" valor={form.codigo} aoMudar={alterar('codigo')} mascara={mascaraCodigo} erro={erros.codigo} placeholder="Ex.: CONJ-CALCA-AZUL" autoFocus={!produto} />
              <Campo rotulo="Preço atual (R$)" valor={form.preco_atual} aoMudar={alterar('preco_atual')} mascara={mascaraPreco} erro={erros.preco_atual} inputMode="decimal" placeholder="159,90" />
              <Campo rotulo="Preço anterior (R$)" opcional valor={form.preco_anterior} aoMudar={alterar('preco_anterior')} mascara={mascaraPreco} erro={erros.preco_anterior} inputMode="decimal" placeholder="199,90" />
              <div className="efeito-x">
                <label className="opcao">
                  <input type="checkbox" checked={form.mostrar_preco_anterior} onChange={(e) => alterar('mostrar_preco_anterior')(e.target.checked)} />
                  Efeito “X” preço anterior
                </label>
                <span className="campo__dica">
                  {form.mostrar_preco_anterior && form.preco_anterior && form.preco_atual ? (
                    <>
                      Na loja: <s>R$ {form.preco_anterior}</s> Por <strong>R$ {form.preco_atual}</strong>
                    </>
                  ) : (
                    'Ligado, a loja mostra o preço anterior riscado: “de R$ X por R$ Y”.'
                  )}
                </span>
              </div>
              <div className="largo">
                <Campo rotulo="Nome" valor={form.nome} aoMudar={alterar('nome')} erro={erros.nome} maxLength={120} placeholder="Ex.: Conjunto Calça Azul" />
              </div>
              <div className="largo">
                <Campo
                  rotulo="Selo-Campanha"
                  opcional
                  valor={form.selo_campanha}
                  aoMudar={(v) => {
                    alterar('selo_campanha')(v)
                    // selo que já existe: usa o tipo que ele já tem
                    const existente = selosExistentes.find((sl) => sl.nome.toLowerCase() === v.trim().toLowerCase())
                    if (existente) alterar('selo_tipo')(existente.tipo)
                  }}
                  erro={erros.selo_campanha}
                  maxLength={40}
                  placeholder="Ex.: Black Friday, Camiseta"
                  list="selos-campanha"
                  dica="Cada selo vira um item no menu lateral do site, que mostra só os produtos com esse selo."
                />
                <datalist id="selos-campanha">
                  {selosExistentes.map((sl) => (
                    <option key={sl.nome} value={sl.nome} />
                  ))}
                </datalist>
              </div>
              {form.selo_campanha.trim() !== '' && (
                <div className="campo largo">
                  <label htmlFor="produto-selo-tipo">Tipo do selo</label>
                  <select id="produto-selo-tipo" value={form.selo_tipo} onChange={(e) => alterar('selo_tipo')(e.target.value)} aria-describedby="produto-selo-tipo-dica">
                    <option value="categoria">Categoria — tipo de produto (ex.: Camiseta, Conjunto)</option>
                    <option value="campanha">Campanha — ação de venda (ex.: Black Friday, Lançamento)</option>
                  </select>
                  <span id="produto-selo-tipo-dica" className={erros.selo_tipo ? 'campo__erro' : 'campo__dica'}>
                    {erros.selo_tipo || 'Define o grupo do menu lateral em que o selo aparece. Vale para todos os produtos com este selo.'}
                  </span>
                </div>
              )}
              <div className="campo largo">
                <label htmlFor="produto-descricao">
                  Descrição <span className="campo__opcional">(opcional)</span>
                </label>
                <textarea id="produto-descricao" rows={3} maxLength={2000} value={form.descricao} onChange={(e) => alterar('descricao')(e.target.value)} />
                {erros.descricao && <span className="campo__erro">{erros.descricao}</span>}
              </div>
              <div className="campo">
                <label htmlFor="produto-campanha">
                  Campanha <span className="campo__opcional">(opcional)</span>
                </label>
                <select id="produto-campanha" value={form.campanha_id} onChange={(e) => alterar('campanha_id')(e.target.value)}>
                  <option value="">Sem campanha</option>
                  {campanhas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} (−{Number(c.desconto_percentual)}%){c.vigente ? '' : ' · fora do período'}
                    </option>
                  ))}
                </select>
                {erros.campanha_id ? <span className="campo__erro">{erros.campanha_id}</span> : !campanhas.length && <span className="campo__dica">Nenhuma campanha cadastrada ainda.</span>}
              </div>
              <label className="opcao opcao--alinhada">
                <input type="checkbox" checked={form.ativo} onChange={(e) => alterar('ativo')(e.target.checked)} />
                Visível na loja
              </label>
            </div>
          </div>
        </section>

        <section className="secao-form" aria-labelledby="embalagem-titulo">
          <h3 id="embalagem-titulo">
            Embalagem e peso <span>(usados no cálculo do frete)</span>
          </h3>
          <div className="grade-medidas">
            <Campo rotulo="Dimensão X — largura (cm)" opcional valor={form.embalagem_x} aoMudar={alterar('embalagem_x')} mascara={mascaraCm} erro={erros.embalagem_x} inputMode="decimal" placeholder="20" />
            <Campo rotulo="Dimensão Y — altura (cm)" opcional valor={form.embalagem_y} aoMudar={alterar('embalagem_y')} mascara={mascaraCm} erro={erros.embalagem_y} inputMode="decimal" placeholder="5" />
            <Campo rotulo="Dimensão Z — comprimento (cm)" opcional valor={form.embalagem_z} aoMudar={alterar('embalagem_z')} mascara={mascaraCm} erro={erros.embalagem_z} inputMode="decimal" placeholder="30" />
            <Campo rotulo="Peso bruto (kg)" opcional valor={form.peso_bruto} aoMudar={alterar('peso_bruto')} mascara={mascaraKg} erro={erros.peso_bruto} inputMode="decimal" placeholder="0,400" dica="Produto com a embalagem." />
            <Campo rotulo="Peso líquido (kg)" opcional valor={form.peso_liquido} aoMudar={alterar('peso_liquido')} mascara={mascaraKg} erro={erros.peso_liquido} inputMode="decimal" placeholder="0,350" dica="Só o produto." />
          </div>
        </section>

        <Variacoes
          filhos={filhos}
          setFilhos={setFilhos}
          cores={cores}
          tamanhos={tamanhos}
          erro={erros.filhos}
          gerador={gerador}
          setGerador={setGerador}
          marcadas={marcadas}
          setMarcadas={setMarcadas}
          aoNovo={setCadastrando}
        />

        {produto && (
          <p className="campo__dica">
            Criado em {formatarDataHora(produto.criado_em)}
            {produto.criado_por_nome ? ` por ${produto.criado_por_nome}` : ''}.
          </p>
        )}
        <div className="acoes-form">
          <button type="button" className="botao botao--secundario" onClick={aoCancelar}>
            Cancelar
          </button>
          <button type="submit" className="botao" disabled={salvando}>
            {salvando ? 'Salvando…' : produto ? 'Salvar produto' : 'Cadastrar produto'}
          </button>
        </div>
      </form>
    </>
  )
}

// ---------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------
export default function CadastroProdutos() {
  const { api } = useAutenticacao()
  const [produtos, setProdutos] = useState(null)
  const [apoio, setApoio] = useState({ cores: [], tamanhos: [], campanhas: [] })
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')
  const { mostrarErro } = useErro()
  const falhar = (mensagem) => {
    setErro(mensagem)
    mostrarErro(mensagem)
  }
  const [aviso, setAviso] = useState('')
  const [modal, setModal] = useState(null) // { tipo: 'novo' | 'editar' | 'excluir', item }

  const carregar = useCallback(async () => {
    const { ok, dados } = await api('/api/cadastro/produtos')
    if (ok) setProdutos(dados.produtos)
    else falhar(dados?.erro || 'Não foi possível carregar os produtos.')
  }, [api])

  useEffect(() => {
    carregar()
    Promise.all([api('/api/cores'), api('/api/tamanhos'), api('/api/campanhas')]).then(([c, t, k]) => setApoio({ cores: c.dados?.cores ?? [], tamanhos: t.dados?.tamanhos ?? [], campanhas: k.dados?.campanhas ?? [] }))
  }, [api, carregar])

  useEffect(() => {
    if (!aviso) return
    const id = setTimeout(() => setAviso(''), 4000)
    return () => clearTimeout(id)
  }, [aviso])

  const editar = async (p) => {
    const { ok, dados } = await api(`/api/cadastro/produtos/${encodeURIComponent(p.codigo)}`)
    if (ok) setModal({ tipo: 'editar', item: dados.produto })
    else falhar(dados?.erro || 'Não foi possível abrir o produto.')
  }

  const concluir = (msg) => {
    setModal(null)
    setAviso(msg)
    carregar()
  }

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!produtos || !t) return produtos
    return produtos.filter((p) => `${p.codigo} ${p.nome} ${p.campanha_nome ?? ''} ${p.selo_campanha ?? ''}`.toLowerCase().includes(t))
  }, [produtos, busca])

  const faltaCadastro = !apoio.cores.length || !apoio.tamanhos.length

  return (
    <PaginaVendedor
      titulo="Produtos"
      trilha={TRILHA}
      largura={1200}
      fixarTopo
      acoes={
        <button type="button" className="botao botao--compacto botao--dourado" aria-label="Novo produto" onClick={() => setModal({ tipo: 'novo' })}>
          + Novo
        </button>
      }
    >
      {produtos && faltaCadastro && (
        <p className="aviso aviso--erro cadastro__aviso">
          Para criar variações, cadastre antes <Link href="/area-do-vendedor/cores">cores</Link> e <Link href="/area-do-vendedor/tamanhos">tamanhos</Link>.
        </p>
      )}
      <div aria-live="polite">{aviso && <p className="aviso aviso--sucesso cadastro__aviso">{aviso}</p>}</div>

      {produtos && produtos.length > 0 && (
        <div className="campo cadastro__busca">
          <label htmlFor="busca-produtos" className="sr-only">
            Buscar produtos
          </label>
          <input id="busca-produtos" type="search" placeholder="Buscar por código, nome, campanha ou selo" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
      )}

      {!produtos && !erro ? (
        <div className="cadastro__carregando" aria-busy="true" aria-label="Carregando produtos" />
      ) : filtrados ? (
        <ListaDados
          rotulo="Produtos"
          itens={filtrados}
          chave={(p) => p.codigo}
          ordemInicial={{ coluna: 'criado_em', direcao: 'desc' }}
          vazio={busca ? `Nenhum produto encontrado para “${busca}”.` : 'Nenhum produto cadastrado.'}
          aoClicarLinha={editar}
          colunas={[
            {
              id: 'imagem',
              titulo: 'Imagem',
              ordenavel: false,
              valor: (p) => p.caminho,
              exibir: (p) => (p.caminho ? <img src={p.caminho} alt="" className="miniatura" loading="lazy" /> : <span className="miniatura miniatura--vazia" />),
            },
            {
              id: 'nome',
              titulo: 'Produto',
              valor: (p) => p.nome,
              destaque: true,
              exibir: (p) => (
                <span className="produto-nome">
                  {p.nome}
                  {!p.ativo && <span className="selo-inativo">Oculto</span>}
                </span>
              ),
            },
            { id: 'codigo', titulo: 'Código', valor: (p) => p.codigo },
            { id: 'preco', titulo: 'Preço atual', valor: (p) => Number(p.preco_atual), exibir: (p) => reais(p.preco_atual), alinhar: 'direita' },
            { id: 'selo', titulo: 'Selo-Campanha', valor: (p) => p.selo_campanha ?? '', exibir: (p) => (p.selo_campanha ? <span className="selo-campanha" title={p.selo_tipo === 'categoria' ? 'Categoria' : 'Campanha'}>{p.selo_campanha}</span> : '—') },
            { id: 'campanha', titulo: 'Campanha', valor: (p) => p.campanha_nome, exibir: (p) => p.campanha_nome ?? '—' },
            { id: 'estoque', titulo: 'Estoque', valor: (p) => p.estoque_total, exibir: (p) => `${p.estoque_total} (${p.variacoes} var.)`, alinhar: 'direita' },
            { id: 'criado_por', titulo: 'Criado por', valor: (p) => p.criado_por_nome, exibir: (p) => p.criado_por_nome ?? '—', noCelular: false },
            { id: 'criado_em', titulo: 'Criado em', valor: (p) => new Date(p.criado_em), exibir: (p) => formatarDataHora(p.criado_em) },
          ]}
          acoes={(p) => (
            <>
              <button type="button" className="lista-acao" onClick={() => editar(p)}>
                Editar
              </button>
              <button type="button" className="lista-acao is-perigo" onClick={() => setModal({ tipo: 'excluir', item: p })}>
                Excluir
              </button>
            </>
          )}
        />
      ) : null}

      <Modal
        aberto={Boolean(modal)}
        aoFechar={() => setModal(null)}
        titulo={{ novo: 'Novo produto', editar: `Editar ${modal?.item?.codigo ?? ''}`, excluir: 'Excluir produto?' }[modal?.tipo] ?? ''}
        largura={modal?.tipo === 'excluir' ? 460 : 920}
      >
        {(modal?.tipo === 'novo' || modal?.tipo === 'editar') && (
          <FormProduto
            key={modal.item?.codigo ?? 'novo'}
            produto={modal.item}
            cores={apoio.cores}
            tamanhos={apoio.tamanhos}
            campanhas={apoio.campanhas}
            selosExistentes={[...new Map((produtos ?? []).filter((p) => p.selo_campanha).map((p) => [p.selo_campanha, { nome: p.selo_campanha, tipo: p.selo_tipo ?? TIPO_SELO_PADRAO }])).values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))}
            aoCriarApoio={(tipo, item) =>
              setApoio((a) =>
                tipo === 'cor' ? { ...a, cores: [...a.cores, item].sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR')) } : { ...a, tamanhos: [...a.tamanhos, item].sort((x, y) => x.sequencia - y.sequencia) },
              )
            }
            aoCancelar={() => setModal(null)}
            aoSalvar={(p) => concluir(modal.tipo === 'novo' ? `Produto ${p.codigo} cadastrado.` : `Produto ${p.codigo} atualizado.`)}
          />
        )}
        {modal?.tipo === 'excluir' && (
          <ConfirmarExclusao
            mensagem={`O produto ${modal.item.codigo} e as ${modal.item.variacoes} variação(ões) dele serão excluídos.`}
            aoConfirmar={() => api(`/api/cadastro/produtos/${encodeURIComponent(modal.item.codigo)}`, { metodo: 'DELETE' })}
            aoConcluir={() => concluir(`Produto ${modal.item.codigo} excluído.`)}
            aoCancelar={() => setModal(null)}
          />
        )}
      </Modal>
    </PaginaVendedor>
  )
}
