// Acesso à tabela "visitantes_log".
import 'server-only'

export class VisitaRepositorio {
  constructor(banco) {
    this.banco = banco
  }

  // Grava a visita só se o mesmo IP não visitou nos últimos `minutos`. Devolve true se gravou.
  async registrarSeNovo(ip, minutos) {
    const { rowCount } = await this.banco.consultar(
      `INSERT INTO visitantes_log (ip)
       SELECT $1::inet
       WHERE NOT EXISTS (
         SELECT 1 FROM visitantes_log
         WHERE ip = $1::inet AND data_hora > now() - make_interval(mins => $2)
       )`,
      [ip, minutos]
    )
    return rowCount > 0
  }

  // Remove registros com mais de `dias`. Devolve quantos foram apagados.
  async apagarAntigos(dias) {
    const { rowCount } = await this.banco.consultar('DELETE FROM visitantes_log WHERE data_hora < now() - make_interval(days => $1)', [dias])
    return rowCount
  }
}
