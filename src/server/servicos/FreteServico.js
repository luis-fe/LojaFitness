// Simulação de frete pelo Melhor Envio (botão "Simular frete" da compra).
//
//   • Só entram os produtos com "calcula frete" ligado; cada um usa a embalagem X/Y/Z (cm),
//     o peso bruto (kg) e o preço (valor segurado) do cadastro — o navegador manda só slug e quantidade.
//   • CEP de origem: MELHORENVIO_CEP_ORIGEM ou, se vazio, o CEP do primeiro local de retirada.
//   • Variáveis: MELHORENVIO_API_URL, MELHORENVIO_TOKEN, MELHORENVIO_USER_AGENT (veja .env.example).
//   • Limite por IP para ninguém usar a loja como proxy da API.
import 'server-only'
import { ErroAplicacao, ErroMuitasTentativas, ErroValidacao } from '@/server/erros'

const MAX_ITENS = 50
const so8Digitos = (v) => String(v ?? '').replace(/\D/g, '')

export class FreteServico {
  constructor({ produtoRepositorio, vendedorServico, limiteTentativas, ambiente = process.env, buscar = (...a) => fetch(...a) }) {
    this.repo = produtoRepositorio
    this.vendedores = vendedorServico
    this.limite = limiteTentativas
    this.env = ambiente
    this.buscar = buscar
  }

  async #cepOrigem() {
    const doEnv = so8Digitos(this.env.MELHORENVIO_CEP_ORIGEM)
    if (doEnv.length === 8) return doEnv
    const locais = await this.vendedores.locaisRetirada()
    return locais.map((l) => so8Digitos(l.cep)).find((c) => c.length === 8) ?? null
  }

  // itens: [{ slug, quantidade }] → [{ id, nome, empresa, logo, preco, prazo }] (mais barato primeiro)
  async simular({ cep, itens }, ip = 'local') {
    const destino = so8Digitos(cep)
    if (destino.length !== 8) throw new ErroValidacao({ cep: 'Informe um CEP válido com 8 números.' })
    if (!Array.isArray(itens) || !itens.length || itens.length > MAX_ITENS) throw new ErroValidacao({ itens: 'Nenhum produto para calcular o frete.' })

    const situacao = this.limite.verificar(ip)
    if (situacao.bloqueado) throw new ErroMuitasTentativas('Muitas simulações seguidas. Tente de novo em instantes.', situacao.tenteEmSegundos)
    this.limite.registrarFalha(ip) // conta cada simulação

    const quantidades = new Map()
    for (const i of itens) {
      const q = Number(i?.quantidade)
      if (typeof i?.slug !== 'string' || !Number.isInteger(q) || q < 1 || q > 999) throw new ErroValidacao({ itens: 'Produto ou quantidade inválidos.' })
      quantidades.set(i.slug, (quantidades.get(i.slug) ?? 0) + q)
    }

    const produtos = (await this.repo.listarParaFrete([...quantidades.keys()])).filter((p) => p.calcula_frete)
    if (!produtos.length) throw new ErroValidacao({ itens: 'Nenhum destes produtos calcula frete pelo site.' })
    const semMedidas = produtos.find((p) => [p.embalagem_x, p.embalagem_y, p.embalagem_z, p.peso_bruto].some((v) => v === null))
    if (semMedidas) throw new ErroValidacao({ itens: `O produto ${semMedidas.nome} está sem medidas da embalagem. Combine o frete pelo WhatsApp.` })

    const { MELHORENVIO_API_URL: base, MELHORENVIO_TOKEN: token, MELHORENVIO_USER_AGENT: agente } = this.env
    const origem = await this.#cepOrigem()
    if (!base || !token || !origem) {
      console.error('[frete] Melhor Envio não configurado (MELHORENVIO_API_URL, MELHORENVIO_TOKEN ou CEP de origem).')
      throw new ErroAplicacao(503, 'Simulação de frete indisponível no momento. Combine o frete pelo WhatsApp.')
    }

    const corpo = {
      from: { postal_code: origem },
      to: { postal_code: destino },
      products: produtos.map((p) => ({
        id: p.slug,
        width: Number(p.embalagem_x),
        height: Number(p.embalagem_y),
        length: Number(p.embalagem_z),
        weight: Number(p.peso_bruto),
        insurance_value: Number(p.preco_final),
        quantity: quantidades.get(p.slug),
      })),
    }

    let resposta
    try {
      resposta = await this.buscar(`${base.replace(/\/+$/, '')}/api/v2/me/shipment/calculate`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'User-Agent': agente || 'Loja',
        },
        body: JSON.stringify(corpo),
        signal: AbortSignal.timeout(15000),
      })
    } catch (erro) {
      console.error('[frete] falha ao chamar o Melhor Envio:', erro?.name)
      throw new ErroAplicacao(502, 'Não foi possível simular o frete agora. Tente de novo.')
    }
    if (!resposta.ok) {
      console.error(`[frete] Melhor Envio respondeu ${resposta.status}`)
      throw new ErroAplicacao(502, 'Não foi possível simular o frete agora. Tente de novo.')
    }

    const lista = await resposta.json().catch(() => [])
    const opcoes = (Array.isArray(lista) ? lista : [])
      .filter((o) => !o?.error && o?.price != null)
      .map((o) => ({
        id: o.id,
        nome: o.name,
        empresa: o.company?.name ?? '',
        logo: o.company?.picture ?? null,
        preco: Number(o.custom_price ?? o.price),
        prazo: Number(o.custom_delivery_time ?? o.delivery_time) || null,
      }))
      .filter((o) => Number.isFinite(o.preco))
      .sort((a, b) => a.preco - b.preco)
    return { cep: destino, opcoes, produtos: produtos.map((p) => p.slug) }
  }
}
