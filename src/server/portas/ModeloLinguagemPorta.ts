// O que os services precisam de um modelo de linguagem, sem saber qual é nem onde roda.
export type MensagemModelo = {
  papel: 'system' | 'user' | 'assistant'
  conteudo: string
}

export type OpcoesGeracao = {
  temperatura?: number
  maximoTokens?: number
}

export interface ModeloLinguagemPorta {
  /** Tokens que o modelo aceita num pedido (entrada e resposta juntas). */
  limiteDeContexto(): number
  /** Resposta única em JSON (o objeto já interpretado). */
  gerarJson(mensagens: MensagemModelo[], opcoes?: OpcoesGeracao): Promise<Record<string, unknown>>
  /** Resposta em texto, em pedaços, à medida que o modelo escreve. */
  transmitir(mensagens: MensagemModelo[], opcoes?: OpcoesGeracao, sinal?: AbortSignal): AsyncGenerator<string>
}

// Falha ao falar com o modelo; `statusCode` é o HTTP que a API deve devolver.
export class ErroModeloLinguagem extends Error {
  constructor(
    mensagem: string,
    readonly statusCode: number,
    options?: ErrorOptions,
  ) {
    super(mensagem, options)
    this.name = 'ErroModeloLinguagem'
  }
}
