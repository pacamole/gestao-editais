// Contratos da API de destinatários (/api/destinatarios).

import type { TipoNotificacao } from './dominio.js'

export type DestinatarioItem = {
  email: string
  usuario: boolean // tem conta no sistema
  alertas: TipoNotificacao[] // alertas que recebe (escolhido ou "todos da lista")
}

export type ListaDestinatariosResposta = { destinatarios: DestinatarioItem[] }
export type AdicionarDestinatarioEntrada = { email: string }
// Alertas que só tinham esse e-mail ficam desativados (lista vazia = todos da lista).
export type RemoverDestinatarioResposta = ListaDestinatariosResposta & { alertas_desativados: TipoNotificacao[] }
