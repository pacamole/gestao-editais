import type {
  MensagemModelo,
  ModeloLinguagemPorta,
  OpcoesGeracao,
} from '../../portas/ModeloLinguagemPorta.js'

export class ModeloLinguagemSelecionado implements ModeloLinguagemPorta {
  constructor(
    private readonly usarApi: () => boolean,
    private readonly ollama: ModeloLinguagemPorta,
    private readonly api: ModeloLinguagemPorta,
  ) {}

  limiteDeContexto(): number {
    return this.atual().limiteDeContexto()
  }

  gerarJson(mensagens: MensagemModelo[], opcoes?: OpcoesGeracao): Promise<Record<string, unknown>> {
    return this.atual().gerarJson(mensagens, opcoes)
  }

  transmitir(mensagens: MensagemModelo[], opcoes?: OpcoesGeracao, sinal?: AbortSignal): AsyncGenerator<string> {
    return this.atual().transmitir(mensagens, opcoes, sinal)
  }

  private atual(): ModeloLinguagemPorta {
    return this.usarApi() ? this.api : this.ollama
  }
}
