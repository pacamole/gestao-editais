// Contratos da API de alertas (/api/alertas).

import type { ConfigAlerta, NotificacaoLog } from './dominio.js'

export type { ConfigAlerta, NotificacaoLog, TipoNotificacao } from './dominio.js'

export type AlertasResposta = {
  configuracoes: ConfigAlerta[]
  logs: NotificacaoLog[]
}

// Parâmetros são mesclados aos atuais no servidor.
export type SalvarAlertaEntrada = ConfigAlerta

export type ConfigAlertaResposta = { ok: true; configuracao: ConfigAlerta }
export type LogsAlertaResposta = { logs: NotificacaoLog[] }
