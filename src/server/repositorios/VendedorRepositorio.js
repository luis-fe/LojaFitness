// Acesso à tabela "vendedores" (somente SQL; as regras ficam no VendedorServico).
import 'server-only'
import { ErroConflito } from '@/server/erros'

// Colunas públicas (nunca inclui senha_hash)
const CAMPOS = `id, login, nome, telefone, cpf_cnpj, tipo_documento, nome_fantasia,
                cep, endereco, uf, cidade, localizacao,
                papel, ativo, acessa_area, recebe_whatsapp, ultimo_login_em, criado_em, atualizado_em`

export class VendedorRepositorio {
  constructor(banco) {
    this.banco = banco
  }

  static traduzirErro(erro) {
    if (erro.code === '23505') {
      if (erro.constraint?.includes('login')) throw new ErroConflito('Este login já está em uso.', { login: 'Este login já está em uso.' })
      if (erro.constraint?.includes('cpf_cnpj')) throw new ErroConflito('CPF/CNPJ já cadastrado.', { cpf_cnpj: 'CPF/CNPJ já cadastrado.' })
    }
    throw erro
  }

  async listar({ busca = '', ativo, pagina, porPagina }) {
    const params = []
    const proximo = (v) => (params.push(v), `$${params.length}`)
    const condicoes = []
    if (busca.trim()) {
      const termo = proximo(`%${busca.trim()}%`)
      const alternativas = [`nome ILIKE ${termo}`, `login ILIKE ${termo}`, `nome_fantasia ILIKE ${termo}`]
      const digitos = busca.replace(/\D/g, '')
      if (digitos.length >= 3) {
        const numero = proximo(`%${digitos}%`)
        alternativas.push(`telefone LIKE ${numero}`, `cpf_cnpj LIKE ${numero}`)
      }
      condicoes.push(`(${alternativas.join(' OR ')})`)
    }
    if (typeof ativo === 'boolean') condicoes.push(`ativo = ${proximo(ativo)}`)
    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''
    const limite = proximo(porPagina)
    const deslocamento = proximo((pagina - 1) * porPagina)

    const { rows } = await this.banco.consultar(
      `SELECT ${CAMPOS}, count(*) OVER()::int AS total_geral
       FROM vendedores ${where}
       ORDER BY ativo DESC, nome
       LIMIT ${limite} OFFSET ${deslocamento}`,
      params
    )
    return { linhas: rows.map(({ total_geral, ...v }) => v), total: rows[0]?.total_geral ?? 0 }
  }

  async buscarPorId(id) {
    const { rows } = await this.banco.consultar(`SELECT ${CAMPOS} FROM vendedores WHERE id = $1`, [id])
    return rows[0] ?? null
  }

  // Locais de retirada (site público): vendedores ativos com endereço ou localização.
  // Só sai o que o cliente precisa para chegar lá — nunca login, telefone ou documento.
  async listarLocaisRetirada(limite) {
    const { rows } = await this.banco.consultar(
      `SELECT COALESCE(nome_fantasia, nome) AS nome, cep, endereco, uf, cidade, localizacao
       FROM vendedores
       WHERE ativo AND (endereco IS NOT NULL OR localizacao IS NOT NULL)
       ORDER BY (papel = 'admin') DESC, id
       LIMIT $1`,
      [limite]
    )
    return rows
  }

  // Telefone que recebe os pedidos do WhatsApp: o vendedor ativo marcado; sem nenhum, o administrador ativo mais antigo
  async telefoneWhatsApp() {
    const { rows } = await this.banco.consultar(
      `SELECT telefone FROM vendedores
       WHERE ativo AND (recebe_whatsapp OR papel = 'admin')
       ORDER BY recebe_whatsapp DESC, id
       LIMIT 1`
    )
    return rows[0]?.telefone ?? null
  }

  // Só 1 vendedor recebe os pedidos: desmarca os outros (dentro da transação)
  async desmarcarWhatsapp(db, excetoId = 0) {
    await db.query('UPDATE vendedores SET recebe_whatsapp = false WHERE recebe_whatsapp AND id <> $1', [excetoId])
  }

  async buscarParaLogin(login) {
    const { rows } = await this.banco.consultar(
      'SELECT id, login, nome, nome_fantasia, papel, ativo, acessa_area, senha_hash FROM vendedores WHERE login = $1',
      [login]
    )
    return rows[0] ?? null
  }

  async buscarEstadoSessao(id) {
    const { rows } = await this.banco.consultar(
      'SELECT id, login, nome, nome_fantasia, papel, ativo, acessa_area, senha_alterada_em FROM vendedores WHERE id = $1',
      [id]
    )
    return rows[0] ?? null
  }

  async buscarHashSenha(id) {
    const { rows } = await this.banco.consultar('SELECT senha_hash FROM vendedores WHERE id = $1', [id])
    return rows[0]?.senha_hash ?? null
  }

  async registrarLogin(id) {
    await this.banco.consultar('UPDATE vendedores SET ultimo_login_em = now() WHERE id = $1', [id])
  }

  async inserir(dados, senhaHash, db = null) {
    const executar = db ? (sql, p) => db.query(sql, p) : (sql, p) => this.banco.consultar(sql, p)
    try {
      const { rows } = await executar(
        `INSERT INTO vendedores (login, nome, senha_hash, telefone, cpf_cnpj, nome_fantasia, papel, cep, endereco, uf, cidade, localizacao, acessa_area, recebe_whatsapp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING ${CAMPOS}`,
        [
          dados.login,
          dados.nome,
          senhaHash,
          dados.telefone,
          dados.cpf_cnpj ?? null,
          dados.nome_fantasia ?? null,
          dados.papel ?? 'vendedor',
          dados.cep ?? null,
          dados.endereco ?? null,
          dados.uf ?? null,
          dados.cidade ?? null,
          dados.localizacao ?? null,
          dados.acessa_area ?? true,
          dados.recebe_whatsapp ?? false,
        ]
      )
      return rows[0]
    } catch (erro) {
      VendedorRepositorio.traduzirErro(erro)
    }
  }

  // ---- usados dentro de transação (db = cliente da transação) ----
  async travar(db, id) {
    const { rows } = await db.query('SELECT papel, ativo, acessa_area FROM vendedores WHERE id = $1 FOR UPDATE', [id])
    return rows[0] ?? null
  }

  async contarAdminsAtivos(db, excetoId) {
    const { rows } = await db.query(
      `SELECT count(*)::int AS total FROM vendedores WHERE papel = 'admin' AND ativo AND acessa_area AND id <> $1`,
      [excetoId ?? 0]
    )
    return rows[0].total
  }

  // colunas vêm de lista fixa do serviço (nunca do usuário)
  async atualizar(db, id, dados, { derrubarSessoes = false } = {}) {
    const colunas = Object.keys(dados)
    const sets = colunas.map((c, i) => `${c} = $${i + 2}`)
    if (derrubarSessoes) sets.push('senha_alterada_em = now()')
    try {
      const { rows } = await db.query(`UPDATE vendedores SET ${sets.join(', ')} WHERE id = $1 RETURNING ${CAMPOS}`, [
        id,
        ...colunas.map((c) => dados[c]),
      ])
      return rows[0]
    } catch (erro) {
      VendedorRepositorio.traduzirErro(erro)
    }
  }

  async atualizarSenha(id, senhaHash) {
    await this.banco.consultar('UPDATE vendedores SET senha_hash = $2, senha_alterada_em = now() WHERE id = $1', [id, senhaHash])
  }
}
