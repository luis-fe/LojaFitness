// Painel da Área do Vendedor (resumo da loja), lista de campanhas e saúde do sistema.
import 'server-only'

export class PainelServico {
  constructor({ banco, painelRepositorio, campanhaRepositorio }) {
    this.banco = banco
    this.painel = painelRepositorio
    this.campanhas = campanhaRepositorio
  }

  // { produtosEmAnuncio, variacoesEmAnuncio, variacoesComEstoque, visitantesSemana, visitasSemana }
  resumo() {
    return this.painel.resumo()
  }

  listarCampanhas() {
    return this.campanhas.listar()
  }

  // { ok, banco: 'conectado' | 'nao_configurado' | 'sem_tabelas' | 'erro_conexao', ... }
  async saude() {
    if (!this.banco.configurado) return { ok: false, banco: 'nao_configurado', mensagem: 'Defina DATABASE_URL no .env.local.' }
    try {
      return { ok: true, banco: 'conectado', ...(await this.painel.saude()) }
    } catch (erro) {
      console.error('[saude]', erro.message)
      const semTabelas = erro.code === '42P01'
      return {
        ok: false,
        banco: semTabelas ? 'sem_tabelas' : 'erro_conexao',
        mensagem: semTabelas ? 'Conectado, mas as tabelas não existem. Rode: npm run db:schema' : 'Não foi possível conectar ao banco.',
      }
    }
  }
}
