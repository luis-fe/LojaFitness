// Etiqueta de envio e DC-e pelo Melhor Envio (forma de envio 3 — "Receber em casa").
//
//   Quando gera (MELHORENVIO_GERAR_ETIQUETA):
//     • "pedido"    → assim que o cliente envia o pedido (fase de testes: sem esperar o pagamento)
//     • "aprovacao" → quando o vendedor aprova o pagamento
//     • vazio       → "pedido" no sandbox e "aprovacao" na produção (na produção a etiqueta é paga de verdade)
//   O vendedor também pode gerar / tentar de novo pelo Aprovar Pagamento.
//
//   DC-e: só para empresa MEI (Minha Empresa → "Empresa é MEI"). O envio vai como não comercial
//   (options.non_commercial) com a lista de produtos, e o Melhor Envio comunica a DC-e à SEFAZ.
//   Empresa que não é MEI precisa de nota fiscal (chave da NF-e), que a loja ainda não emite: a etiqueta não é gerada.
//
//   Passos: carrinho → compra (saldo da carteira do Melhor Envio) → geração → link público de impressão.
//   Se um passo falhar, o envio fica "erro" com a mensagem; "tentar de novo" continua de onde parou
//   (reaproveita as etiquetas já criadas no carrinho, sem pagar duas vezes).
import 'server-only'
import { ErroAplicacao, ErroNaoEncontrado } from '@/server/erros'
import { ErroMelhorEnvio } from '@/server/integracoes/MelhorEnvio'

const so = (v) => String(v ?? '').replace(/\D/g, '')
const dinheiro = (v) => Math.round(Number(v) * 100) / 100
// Transportadoras que não aceitam vários volumes numa etiqueta (1 etiqueta por pacote)
const UM_VOLUME_POR_ETIQUETA = /correios|j&t|loggi/i

class ErroEtiqueta extends Error {}

export class EtiquetaServico {
  constructor({ envioRepositorio, empresaServico, freteServico, melhorEnvio, ambiente = process.env }) {
    this.repo = envioRepositorio
    this.empresa = empresaServico
    this.frete = freteServico
    this.me = melhorEnvio
    this.env = ambiente
  }

  get modo() {
    const m = String(this.env.MELHORENVIO_GERAR_ETIQUETA ?? '').trim().toLowerCase()
    if (m === 'pedido' || m === 'aprovacao') return m
    return this.me.sandbox ? 'pedido' : 'aprovacao'
  }

  // Dispara a geração sem segurar a resposta ao cliente / vendedor
  gerarEmSegundoPlano(idPedido) {
    this.gerar(idPedido).catch((erro) => console.error(`[etiqueta] pedido ${idPedido}:`, erro?.message))
  }

  async gerar(idPedido) {
    const envio = await this.repo.reservarGeracao(idPedido)
    if (!envio) {
      const atual = await this.repo.buscar(idPedido)
      if (!atual) throw new ErroNaoEncontrado('Este pedido não tem envio pela transportadora.')
      return atual // já está gerando ou gerada
    }
    try {
      return await this.#gerar(idPedido, envio)
    } catch (erro) {
      const mensagem = erro instanceof ErroEtiqueta || erro instanceof ErroMelhorEnvio ? erro.message : 'Falha inesperada ao gerar a etiqueta.'
      if (!(erro instanceof ErroEtiqueta)) console.error(`[etiqueta] pedido ${idPedido}:`, erro?.message, erro?.detalhes ? JSON.stringify(erro.detalhes).slice(0, 500) : '')
      return this.repo.atualizar(idPedido, { situacao: 'erro', erro: mensagem.slice(0, 500) })
    }
  }

  async #gerar(idPedido, envio) {
    if (!this.me.configurado) throw new ErroEtiqueta('Melhor Envio não configurado no servidor (MELHORENVIO_API_URL / MELHORENVIO_TOKEN).')

    // Remetente: Minha Empresa
    const emp = await this.empresa.buscar()
    if (!emp) throw new ErroEtiqueta('Cadastre os dados da empresa em Perfil → Minha Empresa.')
    const faltaEmpresa = [
      ['CEP', emp.cep],
      ['rua', emp.logradouro],
      ['número', emp.numero],
      ['bairro', emp.bairro],
      ['cidade', emp.cidade],
      ['UF', emp.uf],
    ].filter(([, v]) => !v)
    if (faltaEmpresa.length) throw new ErroEtiqueta(`Complete o endereço da empresa em Minha Empresa: ${faltaEmpresa.map(([n]) => n).join(', ')}.`)
    if (!emp.e_mei) {
      throw new ErroEtiqueta(
        'A empresa não está marcada como MEI: a DC-e não é emitida. Envio comercial exige nota fiscal (chave da NF-e), que a loja ainda não emite.'
      )
    }

    // Destinatário: cliente (dados pedidos no ato da compra)
    const d = await this.repo.dadosEtiqueta(idPedido)
    if (!d) throw new ErroEtiqueta('Pedido não encontrado.')
    if (!d.logradouro || !d.numero || so(d.cpf_cnpj).length !== 11 || !so(d.telefone)) {
      throw new ErroEtiqueta('Faltam dados de entrega do cliente (rua, número, CPF ou celular).')
    }

    let ids = envio.me_ids ?? []
    let protocolos = envio.me_protocolos ?? []
    if (!ids.length) {
      const carrinhos = await this.#montarEtiquetas(envio, emp, d)
      for (const corpo of carrinhos) {
        const r = await this.me.inserirNoCarrinho(corpo)
        ids = [...ids, r.id]
        protocolos = [...protocolos, r.protocol]
        await this.repo.atualizar(idPedido, { me_ids: ids, me_protocolos: protocolos, dce: true })
      }
    }

    try {
      await this.me.comprar(ids)
    } catch (erro) {
      if (!(erro instanceof ErroMelhorEnvio && /pag/i.test(erro.message))) throw erro // "já foram pagas" = segue
    }
    await this.me.gerar(ids)
    const url = await this.me.imprimir(ids)
    return this.repo.atualizar(idPedido, { situacao: 'gerada', etiqueta_url: url, erro: null, gerada_em: new Date(), dce: true })
  }

  // Corpo(s) do POST /cart: recota o serviço escolhido para pegar os pacotes (volumes) do Melhor Envio
  async #montarEtiquetas(envio, emp, d) {
    const porSlug = new Map()
    for (const i of d.itens.filter((x) => x.calcula_frete && x.slug)) porSlug.set(i.slug, (porSlug.get(i.slug) ?? 0) + i.quant)
    if (!porSlug.size) throw new ErroEtiqueta('Nenhum produto deste pedido está com "calcula frete" ligado.')
    const cotacao = await this.frete.cotarServico({
      cep: d.cliente_cep,
      itens: [...porSlug].map(([slug, quantidade]) => ({ slug, quantidade })),
      servicoId: envio.servico_id,
    })
    if (!cotacao.pacotes.length) throw new ErroEtiqueta('O Melhor Envio não devolveu os pacotes deste frete. Tente de novo.')

    // Produtos para a DC-e: um por SKU (nome, cor e tamanho), com quantidade e preço de venda
    const produtosSku = d.itens.map((i) => ({
      slug: i.slug,
      name: [i.produto_nome || i.codigo_produto, i.cor_nome || i.cor, i.tam].filter(Boolean).join(' ').slice(0, 100),
      quantity: i.quant,
      unitary_value: dinheiro(i.preco),
    }))

    const de = {
      name: emp.razao_social,
      phone: emp.contato || undefined,
      email: emp.email || undefined,
      company_document: emp.cnpj,
      state_register: 'ISENTO', // não comercial (DC-e)
      address: emp.logradouro,
      number: emp.numero,
      complement: emp.complemento || '',
      district: emp.bairro,
      city: emp.cidade,
      postal_code: emp.cep,
      state_abbr: emp.uf,
      country_id: 'BR',
    }
    const para = {
      name: d.nome,
      phone: so(d.telefone),
      email: d.email || undefined,
      document: so(d.cpf_cnpj),
      address: d.logradouro,
      number: d.numero,
      complement: d.complemento || '',
      district: d.bairro,
      city: d.cidade,
      postal_code: d.cliente_cep,
      state_abbr: d.estado,
      country_id: 'BR',
    }
    const volume = (p) => ({ height: Number(p.dimensions?.height), width: Number(p.dimensions?.width), length: Number(p.dimensions?.length), weight: Number(p.weight) })
    const corpo = (produtos, volumes) => ({
      service: envio.servico_id,
      from: de,
      to: para,
      products: produtos.map(({ slug, ...p }) => p),
      volumes,
      options: {
        insurance_value: dinheiro(produtos.reduce((s, p) => s + p.quantity * p.unitary_value, 0)),
        receipt: false,
        own_hand: false,
        reverse: false,
        non_commercial: true,
        platform: 'JLK Fitness e Casual',
        tags: [{ tag: d.codigo, url: null }],
      },
    })

    if (cotacao.pacotes.length === 1 || !UM_VOLUME_POR_ETIQUETA.test(envio.transportadora)) {
      return [corpo(produtosSku, cotacao.pacotes.map(volume))]
    }
    // Correios / J&T / Loggi com vários pacotes: 1 etiqueta por pacote, com os produtos daquele pacote
    return cotacao.pacotes.map((pac) => {
      const produtos = (pac.products ?? []).flatMap((pp) => {
        const doSlug = produtosSku.filter((p) => p.slug === pp.id)
        const preco = doSlug.length ? doSlug.reduce((s, p) => s + p.unitary_value * p.quantity, 0) / doSlug.reduce((s, p) => s + p.quantity, 0) : 0
        const nome = (doSlug[0]?.name ?? pp.id).split(' ').slice(0, -2).join(' ') || pp.id
        return [{ slug: pp.id, name: nome, quantity: pp.quantity, unitary_value: dinheiro(preco) }]
      })
      return corpo(produtos.length ? produtos : produtosSku, [volume(pac)])
    })
  }

  buscar(idPedido) {
    return this.repo.buscar(idPedido)
  }

  // Links do PDF da DACE (impressão da DC-e) — uma por etiqueta
  async dace(idPedido) {
    const envio = await this.repo.buscar(idPedido)
    if (!envio) throw new ErroNaoEncontrado('Este pedido não tem envio pela transportadora.')
    if (envio.situacao !== 'gerada' || !envio.me_ids.length) throw new ErroAplicacao(409, 'Gere a etiqueta antes de imprimir a DC-e.')
    if (!envio.dce) throw new ErroAplicacao(409, 'Este envio não tem DC-e.')
    try {
      const urls = []
      for (const id of envio.me_ids) urls.push(await this.me.dace(id))
      return { urls: urls.filter(Boolean) }
    } catch (erro) {
      if (erro instanceof ErroMelhorEnvio && /E-PRT|processad/i.test(erro.message)) {
        throw new ErroAplicacao(409, 'A DC-e ainda está sendo processada pelo Melhor Envio. Tente de novo em alguns minutos.')
      }
      if (erro instanceof ErroMelhorEnvio) throw new ErroAplicacao(502, `Melhor Envio: ${erro.message}`)
      throw erro
    }
  }
}
