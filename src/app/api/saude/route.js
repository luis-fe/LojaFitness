// GET /api/saude — verifica se o servidor e o banco de dados estão funcionando
import { bancoConfigurado, query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!bancoConfigurado()) {
    return Response.json(
      { ok: false, banco: 'nao_configurado', mensagem: 'Defina DATABASE_URL no .env.local.' },
      { status: 503 }
    )
  }

  try {
    const { rows } = await query(
      `SELECT current_database() AS nome_banco,
              split_part(version(), ' ', 2) AS versao,
              (SELECT count(*) FROM produtos) AS produtos`
    )
    return Response.json({ ok: true, banco: 'conectado', ...rows[0] })
  } catch (erro) {
    console.error('[api/saude]', erro.message)
    const semTabelas = erro.code === '42P01' // tabela não existe
    return Response.json(
      {
        ok: false,
        banco: semTabelas ? 'sem_tabelas' : 'erro_conexao',
        mensagem: semTabelas ? 'Conectado, mas as tabelas não existem. Rode: npm run db:schema' : 'Não foi possível conectar ao banco.',
      },
      { status: 503 }
    )
  }
}
