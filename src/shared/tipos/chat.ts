// Contratos da API de chat sobre o edital (/api/editais/:id/chat).

import type { Mensagem } from './dominio.js'

export type { PapelMensagem } from './dominio.js'

export type MensagemChat = Mensagem

export type HistoricoChatResposta = {
  mensagens: MensagemChat[]
  limite: number
  restantes: number
}

export type PerguntarEntrada = { pergunta: string }

export type LimparChatResposta = { ok: true }

// Erro JSON devolvido antes do stream (400/404/409/429). No 429 vêm limite e restantes.
export type ErroChatDados = { erro: string; limite?: number; restantes?: number }

// Eventos do stream NDJSON do POST, um por linha.
export type EventoChat =
  | { tipo: 'status'; mensagem: string }
  | { tipo: 'trecho'; conteudo: string }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'concluido'; mensagens: MensagemChat[]; limite: number; restantes: number }
