import type { EventoChat, HistoricoChatResposta, LimparChatResposta } from '../../shared/tipos/chat'
import { requisicao, requisicaoBruta } from './cliente'

const base = (id: string) => `/api/editais/${encodeURIComponent(id)}/chat`

// Envia a pergunta e emite os eventos do stream NDJSON conforme chegam.
// Erros antes do stream (400/409/429) viram ErroApi, com o corpo em erro.dados.
async function* perguntar(id: string, pergunta: string, sinal?: AbortSignal): AsyncGenerator<EventoChat> {
  const resposta = await requisicaoBruta(base(id), { metodo: 'POST', corpo: { pergunta }, sinal })
  if (!resposta.body) throw new Error('O servidor não iniciou a transmissão da resposta.')

  const leitor = resposta.body.getReader()
  const decodificador = new TextDecoder()
  let buffer = ''
  let terminou = false
  try {
    while (true) {
      const { done, value } = await leitor.read()
      buffer += decodificador.decode(value, { stream: !done })
      const linhas = buffer.split('\n')
      buffer = linhas.pop() ?? ''
      for (const linha of linhas) {
        if (linha.trim()) yield JSON.parse(linha) as EventoChat
      }
      if (done) break
    }
    terminou = true
    // Última linha sem quebra no fim.
    if (buffer.trim()) yield JSON.parse(buffer) as EventoChat
  } finally {
    // Quem consome parou antes do fim: libera a conexão.
    if (!terminou) leitor.cancel().catch(() => {})
  }
}

export const chat = {
  historico: (id: string) => requisicao<HistoricoChatResposta>(base(id)),

  limpar: (id: string) => requisicao<LimparChatResposta>(base(id), { metodo: 'DELETE' }),

  perguntar,
}
