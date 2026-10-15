import type { NotificacaoLog, TipoNotificacao } from '../dominio/entidades.js'
import { Repositorio } from './repositorio.js'

export class NotificacaoLogRepositorio extends Repositorio<NotificacaoLog, string, 'id' | 'marco' | 'enviado_em'> {
  protected readonly tabela = 'notificacao_log'
  protected readonly colunasJson = ['destinatarios'] as const
  protected readonly colunaCriacao = 'enviado_em'
  protected readonly ordemPadrao = 'enviado_em DESC'

  /** Regra anti-spam: só conta envio bem-sucedido, então uma falha pode ser tentada de novo. */
  jaEnviada(tipo: TipoNotificacao, editalId: string | null, marco: string): boolean {
    return (
      this.contarOnde("tipo = ? AND edital_id IS ? AND marco = ? AND status_envio = 'ENVIADO'", tipo, editalId, marco) > 0
    )
  }

  recentes(limite: number): NotificacaoLog[] {
    return this.consultar('SELECT * FROM notificacao_log ORDER BY enviado_em DESC LIMIT ?', limite)
  }

  /** Último envio bem-sucedido de cada tipo. */
  ultimosEnvios(): Partial<Record<TipoNotificacao, string>> {
    const logs = this.consultar(
      `SELECT * FROM notificacao_log l WHERE status_envio = 'ENVIADO' AND enviado_em =
         (SELECT MAX(enviado_em) FROM notificacao_log WHERE tipo = l.tipo AND status_envio = 'ENVIADO')`,
    )
    return Object.fromEntries(logs.map((l) => [l.tipo, l.enviado_em]))
  }
}
