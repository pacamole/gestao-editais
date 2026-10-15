// Contratos da API de alertas (/api/alertas).

import type { ConfigAlerta, NotificacaoLog, TipoNotificacao } from './dominio.js'

export type { ConfigAlerta, NotificacaoLog, TipoNotificacao } from './dominio.js'

export type AlertasResposta = {
  configuracoes: ConfigAlerta[]
  logs: NotificacaoLog[]
  // Data do último envio bem-sucedido de cada tipo.
  ultimos_envios: Partial<Record<TipoNotificacao, string>>
}

// Salva vários alertas de uma vez (tudo ou nada). Parâmetros ausentes ficam com o padrão.
export type SalvarAlertasEntrada = { configuracoes: ConfigAlerta[] }
export type SalvarAlertasResposta = { ok: true; configuracoes: ConfigAlerta[] }

export type LogsAlertaResposta = { logs: NotificacaoLog[] }

// Envio de teste com dados fictícios; vazio = todos da lista de destinatários.
export type SimularAlertaEntrada = { destinatarios: string[] }
export type SimularAlertaResposta = {
  enviados: string[]
  falhas: string[]
  smtp_ativo: boolean // false = e-mails só impressos no terminal do servidor
}
