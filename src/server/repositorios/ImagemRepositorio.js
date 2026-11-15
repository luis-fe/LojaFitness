// Acesso à tabela "imagens".
import 'server-only'
import { ErroConflito } from '@/server/erros'

const CAMPOS = `i.id, i.codigo, i.descricao, i.arquivo, i.tipo_mime, i.tamanho_bytes, i.largura, i.altura,
                i.vendedor_id, v.nome AS vendedor_nome, i.criado_em, i.atualizado_em`
const BASE = 'FROM imagens i LEFT JOIN vendedores v ON v.id = i.vendedor_id'

// Endereço público da imagem (servido por /arquivos/<nome>)
const comUrl = (linha) => linha && { ...linha, url: `/arquivos/${linha.arquivo}` }

export class ImagemRepositorio {
  constructor(banco) {
    this.banco = banco
  }

  static traduzirErro(erro) {
    if (erro.code === '23505' && erro.constraint?.includes('codigo')) {
      throw new ErroConflito('Já existe uma imagem com este código.', { codigo: 'Já existe uma imagem com este código.' })
    }
    throw erro
  }

  async listar({ busca = '', pagina, porPagina }) {
    const params = []
    let where = ''
    if (busca.trim()) {
      params.push(`%${busca.trim()}%`)
      where = 'WHERE i.codigo ILIKE $1 OR i.descricao ILIKE $1'
    }
    params.push(porPagina, (pagina - 1) * porPagina)
    const { rows } = await this.banco.consultar(
      `SELECT ${CAMPOS}, count(*) OVER()::int AS total_geral ${BASE} ${where}
       ORDER BY i.criado_em DESC, i.id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )
    return { linhas: rows.map(({ total_geral, ...i }) => comUrl(i)), total: rows[0]?.total_geral ?? 0 }
  }

  async buscarPorId(id) {
    const { rows } = await this.banco.consultar(`SELECT ${CAMPOS} ${BASE} WHERE i.id = $1`, [id])
    return comUrl(rows[0]) ?? null
  }

  async tipoDoArquivo(arquivo) {
    const { rows } = await this.banco.consultar('SELECT tipo_mime FROM imagens WHERE arquivo = $1', [arquivo])
    return rows[0]?.tipo_mime ?? null
  }

  async codigoExiste(codigo) {
    const { rows } = await this.banco.consultar('SELECT 1 FROM imagens WHERE codigo = $1', [codigo])
    return rows.length > 0
  }

  async donoDe(id) {
    const { rows } = await this.banco.consultar('SELECT vendedor_id FROM imagens WHERE id = $1', [id])
    return rows[0] ? { vendedorId: rows[0].vendedor_id } : null
  }

  async inserir(d) {
    try {
      const { rows } = await this.banco.consultar(
        `INSERT INTO imagens (codigo, descricao, arquivo, tipo_mime, tamanho_bytes, largura, altura, vendedor_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [d.codigo, d.descricao, d.arquivo, d.tipoMime, d.tamanhoBytes, d.largura, d.altura, d.vendedorId]
      )
      return rows[0].id
    } catch (erro) {
      ImagemRepositorio.traduzirErro(erro)
    }
  }

  // colunas: somente 'codigo' / 'descricao' (validadas no serviço)
  async atualizar(id, dados) {
    const colunas = Object.keys(dados)
    try {
      await this.banco.consultar(`UPDATE imagens SET ${colunas.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE id = $1`, [
        id,
        ...colunas.map((c) => dados[c]),
      ])
    } catch (erro) {
      ImagemRepositorio.traduzirErro(erro)
    }
  }

  async excluir(id) {
    const { rows } = await this.banco.consultar('DELETE FROM imagens WHERE id = $1 RETURNING arquivo', [id])
    return rows[0]?.arquivo ?? null
  }
}
