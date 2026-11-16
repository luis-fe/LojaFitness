// =============================================================================
//  CONTAINER — monta e liga todas as classes do backend (injeção de dependências)
//
//  Fluxo de uma requisição:
//    src/app/api/.../route.js  →  Controller  →  Serviço (regras)  →  Repositório (SQL)  →  PostgreSQL
//
//  Para trocar uma peça (ex.: testar um serviço com um repositório falso), basta
//  instanciar a classe com outras dependências — nenhuma classe cria as próprias dependências.
// =============================================================================
import 'server-only'
import { banco } from '@/server/config/BancoDeDados'
import { criarRota } from '@/server/http/Rota'
import { Autenticador } from '@/server/http/Autenticador'
import { LimiteTentativas } from '@/server/utils/LimiteTentativas'

import { VendedorRepositorio } from '@/server/repositorios/VendedorRepositorio'
import { ImagemRepositorio } from '@/server/repositorios/ImagemRepositorio'
import { LayoutRepositorio } from '@/server/repositorios/LayoutRepositorio'
import { TamanhoRepositorio } from '@/server/repositorios/TamanhoRepositorio'
import { CorRepositorio } from '@/server/repositorios/CorRepositorio'
import { ProdutoRepositorio } from '@/server/repositorios/ProdutoRepositorio'
import { CampanhaRepositorio } from '@/server/repositorios/CampanhaRepositorio'
import { PainelRepositorio } from '@/server/repositorios/PainelRepositorio'
import { VisitaRepositorio } from '@/server/repositorios/VisitaRepositorio'

import { AuthServico } from '@/server/servicos/AuthServico'
import { VendedorServico } from '@/server/servicos/VendedorServico'
import { ArmazenamentoServico } from '@/server/servicos/ArmazenamentoServico'
import { ImagemServico } from '@/server/servicos/ImagemServico'
import { LayoutServico } from '@/server/servicos/LayoutServico'
import { TamanhoServico } from '@/server/servicos/TamanhoServico'
import { CorServico } from '@/server/servicos/CorServico'
import { ProdutoServico } from '@/server/servicos/ProdutoServico'
import { PedidoServico } from '@/server/servicos/PedidoServico'
import { PainelServico } from '@/server/servicos/PainelServico'
import { VisitaServico } from '@/server/servicos/VisitaServico'

import { AuthController } from '@/server/controllers/AuthController'
import { VendedorController } from '@/server/controllers/VendedorController'
import { ImagemController } from '@/server/controllers/ImagemController'
import { LayoutController } from '@/server/controllers/LayoutController'
import { TamanhoController } from '@/server/controllers/TamanhoController'
import { CorController } from '@/server/controllers/CorController'
import { ProdutoController } from '@/server/controllers/ProdutoController'
import { LojaController } from '@/server/controllers/LojaController'
import { VisitaController } from '@/server/controllers/VisitaController'

// ---------- Repositórios (SQL) ----------
const vendedorRepositorio = new VendedorRepositorio(banco)
const imagemRepositorio = new ImagemRepositorio(banco)
const layoutRepositorio = new LayoutRepositorio(banco)
const tamanhoRepositorio = new TamanhoRepositorio(banco)
const corRepositorio = new CorRepositorio(banco)
const produtoRepositorio = new ProdutoRepositorio(banco)
const campanhaRepositorio = new CampanhaRepositorio(banco)
const painelRepositorio = new PainelRepositorio(banco)
const visitaRepositorio = new VisitaRepositorio(banco)

// ---------- Serviços (regras de negócio) ----------
export const authServico = new AuthServico({ vendedorRepositorio, limiteTentativas: new LimiteTentativas({ nome: 'login' }) })
export const vendedorServico = new VendedorServico({ banco, vendedorRepositorio })
export const imagemServico = new ImagemServico({ imagemRepositorio, armazenamento: new ArmazenamentoServico() })
export const layoutServico = new LayoutServico({ layoutRepositorio })
export const tamanhoServico = new TamanhoServico({ tamanhoRepositorio })
export const corServico = new CorServico({ corRepositorio })
export const produtoServico = new ProdutoServico({ produtoRepositorio })
export const pedidoServico = new PedidoServico()
export const painelServico = new PainelServico({ banco, painelRepositorio, campanhaRepositorio })
export const visitaServico = new VisitaServico({ visitaRepositorio })

// ---------- HTTP ----------
const autenticador = new Autenticador({ authServico, vendedorRepositorio })
const rota = criarRota(autenticador)

// ---------- Controllers (usados pelos arquivos route.js) ----------
export const authController = new AuthController({ rota, authServico })
export const vendedorController = new VendedorController({ rota, vendedorServico })
export const imagemController = new ImagemController({ rota, imagemServico })
export const layoutController = new LayoutController({ rota, layoutServico })
export const tamanhoController = new TamanhoController({ rota, tamanhoServico })
export const corController = new CorController({ rota, corServico })
export const produtoController = new ProdutoController({ rota, produtoServico })
export const lojaController = new LojaController({ rota, pedidoServico, painelServico })
export const visitaController = new VisitaController({ visitaServico })
