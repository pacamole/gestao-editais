import type { NotificacaoLog, TipoNotificacao } from '../entidades.js'
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
}
