// Acesso à tabela "empresa" (uma linha só, id = 1).
import 'server-only'

const CAMPOS = `cnpj, razao_social, administrador, cep, email, localizacao_coordenada,
  e_mei, contato, atualizado_em`

export class EmpresaRepositorio {
  constructor(banco) {
    this.banco = banco
  }

  async buscar() {
    const { rows } = await this.banco.consultar(`SELECT ${CAMPOS} FROM empresa WHERE id = 1`)
    return rows[0] ?? null
  }

  // Cria a linha se ainda não existir; senão atualiza (todos os campos vêm validados do serviço)
  async salvar(d, vendedorId) {
    const { rows } = await this.banco.consultar(
      `INSERT INTO empresa (id, cnpj, razao_social, administrador, cep, email, localizacao_coordenada, e_mei, contato, atualizado_por)
       VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         cnpj = EXCLUDED.cnpj,
         razao_social = EXCLUDED.razao_social,
         administrador = EXCLUDED.administrador,
         cep = EXCLUDED.cep,
         email = EXCLUDED.email,
         localizacao_coordenada = EXCLUDED.localizacao_coordenada,
         e_mei = EXCLUDED.e_mei,
         contato = EXCLUDED.contato,
         atualizado_por = EXCLUDED.atualizado_por
       RETURNING ${CAMPOS}`,
      [d.cnpj, d.razao_social, d.administrador, d.cep, d.email, d.localizacao_coordenada, d.e_mei, d.contato, vendedorId ?? null]
    )
    return rows[0]
  }
}
