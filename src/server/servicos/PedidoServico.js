// Regras de pedido: confere itens e estoque e recalcula o total com os preços do servidor
// (nunca confia em preços enviados pelo navegador), confere o cliente e grava cliente + pedido
// (situação 0 = Rascunho) + itens numa transação. Devolve o número, a mensagem e o link do WhatsApp.
//   Forma de envio 3 (Receber em casa): confere os dados de entrega, recota no Melhor Envio o serviço escolhido
//   (preço do servidor) e grava o envio; a etiqueta é gerada conforme EtiquetaServico.modo.
import 'server-only'
import { ErroValidacao } from '@/server/erros'
import { linkWhatsApp, mensagemPedido } from '@/lib/whatsapp'
import { validarCliente } from '@/lib/cliente'
import { normalizarFrete, FRETE_TRANSPORTADORA } from '@/lib/frete'
import { validarEntrega } from '@/lib/entrega'

export class PedidoServico {
  static MAX_ITENS = 50
  static LIMPEZA_A_CADA_MS = 60 * 60 * 1000 // limpeza de rascunhos antigos no máximo 1 vez por hora

  constructor({ catalogoServico, pedidoRepositorio, freteServico = null, etiquetaServico = null, empresaServico = null, vendedorServico = null }) {
    this.empresa = empresaServico
    this.vendedores = vendedorServico
    this.catalogo = catalogoServico
    this.pedidos = pedidoRepositorio
    this.frete = freteServico
    this.etiquetas = etiquetaServico
  }

  // envioEntrada (só com frete 3): { servico: id do serviço escolhido na cotação, entrega: { logradouro, numero, complemento, cpf, telefone, email } }
  async validar(entrada, clienteEntrada, freteEntrada, envioEntrada) {
    if (!Array.isArray(entrada) || entrada.length === 0) throw new ErroValidacao({ itens: 'O pedido está vazio.' }, 'O pedido está vazio.')
    if (entrada.length > PedidoServico.MAX_ITENS) throw new ErroValidacao({ itens: `Máximo de ${PedidoServico.MAX_ITENS} itens por pedido.` })

    const { dados: cliente, erros: errosCliente } = validarCliente(clienteEntrada ?? {})
    const catalogo = await this.catalogo.listar()
    const erros = Object.values(errosCliente)
    const frete = normalizarFrete(freteEntrada) // vazio = Combinar Frete
    if (frete === null) erros.push('Forma de envio inválida.')
    let entrega = null
    if (frete === FRETE_TRANSPORTADORA) {
      const r = validarEntrega(envioEntrada?.entrega ?? {})
      erros.push(...Object.values(r.erros))
      entrega = r.dados
      if (!Number.isInteger(Number(envioEntrada?.servico)) || !envioEntrada?.servico) erros.push('Escolha uma opção de frete.')
    }
    const itens = []
    for (const [n, item] of entrada.entries()) {
      const produto = catalogo.find((p) => p.slug === item?.slug)
      const quantidade = Number(item?.quantidade)
      const rotulo = `Item ${n + 1}`

      if (!produto) {
        erros.push(`${rotulo}: produto não encontrado.`)
        continue
      }
      if (!produto.cores.some((c) => c.nome === item.cor)) {
        erros.push(`${rotulo}: cor "${item.cor}" indisponível para ${produto.nome}.`)
        continue
      }
      if (produto.estoque[item.cor]?.[item.tamanho] === undefined) {
        erros.push(`${rotulo}: ${produto.nome} ${item.cor} não possui o tamanho "${item.tamanho}".`)
        continue
      }
      if (!Number.isInteger(quantidade) || quantidade < 1) {
        erros.push(`${rotulo}: quantidade inválida.`)
        continue
      }
      const disponivel = produto.estoque[item.cor]?.[item.tamanho] ?? 0
      if (quantidade > disponivel) {
        erros.push(`${rotulo}: só há ${disponivel} disponíve${disponivel === 1 ? 'l' : 'is'} de ${produto.nome} ${item.cor} ${item.tamanho}.`)
        continue
      }
      itens.push({
        codigoProduto: produto.codigo,
        codigoCor: produto.cores.find((c) => c.nome === item.cor)?.codigo,
        slug: produto.slug,
        nome: produto.nome,
        cor: item.cor,
        tamanho: item.tamanho,
        quantidade,
        preco: produto.preco,
        subtotal: Math.round(produto.preco * quantidade * 100) / 100,
      })
    }

    if (erros.length) {
      const e = new ErroValidacao(undefined, erros[0])
      e.listaErros = erros
      throw e
    }

    const total = Math.round(itens.reduce((s, i) => s + i.subtotal, 0) * 100) / 100

    // Receber em casa: recota no Melhor Envio só os produtos com "calcula frete" (o preço nunca vem do navegador)
    let envio = null
    if (frete === FRETE_TRANSPORTADORA) {
      const porSlug = new Map()
      for (const i of itens) if (catalogo.find((p) => p.slug === i.slug)?.calculaFrete) porSlug.set(i.slug, (porSlug.get(i.slug) ?? 0) + i.quantidade)
      if (!porSlug.size || !this.frete) throw new ErroValidacao({ frete: 'Estes produtos não têm entrega pela transportadora. Combine o frete pelo WhatsApp.' })
      const s = await this.frete.cotarServico({ cep: cliente.cep, itens: [...porSlug].map(([slug, quantidade]) => ({ slug, quantidade })), servicoId: envioEntrada.servico })
      envio = { servico: { id: s.id, nome: s.nome, empresa: s.empresa, preco: s.preco, prazo: s.prazo }, entrega }
    }

    const pedido = await this.pedidos.criarRascunho({ cliente, itens, total, frete, envio })
    this.#limparRascunhosSeNecessario()
    if (envio && this.etiquetas?.modo === 'pedido') this.etiquetas.gerarEmSegundoPlano(pedido.id_pedido)
    const mensagem = mensagemPedido(itens, cliente, pedido.codigo, frete, envio?.servico)
    const publicos = itens.map(({ codigoProduto, codigoCor, ...resto }) => resto) // códigos internos ficam no servidor
    return {
      pedido: { codigo: pedido.codigo, situacao: pedido.situacao, frete, valorFrete: envio?.servico.preco ?? 0 },
      itens: publicos,
      total,
      mensagem,
      whatsappUrl: linkWhatsApp(mensagem, await this.#whatsappDaLoja()),
    }
  }

  // Número que recebe o pedido: vendedor marcado em "Recebe pedidos do WhatsApp" (sem nenhum, o administrador);
  // sem vendedor com telefone, o Contato de Minha Empresa; por último, NEXT_PUBLIC_WHATSAPP_NUMERO
  async #whatsappDaLoja() {
    try {
      return (await this.vendedores?.whatsappPedidos()) || (await this.empresa?.whatsapp()) || ''
    } catch (erro) {
      console.error('[pedidos] não foi possível ler o contato da empresa:', erro.message)
      return ''
    }
  }

  // Rascunhos com mais de 15 dias saem sozinhos (não trava o pedido do cliente se falhar)
  #limparRascunhosSeNecessario() {
    const agora = Date.now()
    if (agora - (globalThis.__jlkUltimaLimpezaRascunhos ?? 0) < PedidoServico.LIMPEZA_A_CADA_MS) return
    globalThis.__jlkUltimaLimpezaRascunhos = agora
    this.pedidos
      .apagarRascunhosAntigos()
      .then((n) => n && console.log(`[pedidos] ${n} rascunho(s) com mais de 15 dias removido(s)`))
      .catch((erro) => console.error('[pedidos] falha ao limpar rascunhos antigos:', erro.message))
  }
}
