import {
  ErroModeloLinguagem,
  type MensagemModelo,
  type ModeloLinguagemPorta,
  type OpcoesGeracao,
} from '../../portas/ModeloLinguagemPorta.js'
import { validarDestinoApi } from '../../util/urlApiSegura.js'

export type ConexaoOpenAI = { url: string; chave: string; modelo: string }

const TIMEOUT_MS = 600_000
const CONTEXTO_PADRAO = 32_768

type RespostaChat = {
  model?: string
  choices?: {
    finish_reason?: string | null
    message?: { content?: unknown; reasoning?: unknown; refusal?: unknown }
  }[]
  usage?: { completion_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } }
}

function textoDaResposta(conteudo: unknown): string {
  if (typeof conteudo === 'string') return conteudo
  if (!Array.isArray(conteudo)) return ''
  return conteudo
    .filter((parte): parte is { text: string } =>
      Boolean(parte) && typeof parte === 'object' && typeof parte.text === 'string' &&
      (parte.type === undefined || parte.type === 'text'),
    )
    .map((parte) => parte.text)
    .join('')
}

export class ApiOpenAIAdaptador implements ModeloLinguagemPorta {
  constructor(
    private readonly lerConexao: () => ConexaoOpenAI,
    private readonly fazerFetch: typeof fetch = fetch,
  ) {}

  limiteDeContexto(): number {
    return CONTEXTO_PADRAO
  }

  async gerarJson(mensagens: MensagemModelo[], opcoes: OpcoesGeracao = {}): Promise<Record<string, unknown>> {
    const resposta = await this.chamar(mensagens, opcoes, false, undefined, true)
    let corpo: RespostaChat
    try {
      corpo = (await resposta.json()) as RespostaChat
    } catch (erro) {
      throw new ErroModeloLinguagem('A API de IA retornou uma resposta inválida.', 502, { cause: erro })
    }

    const escolha = corpo.choices?.[0]
    const mensagem = escolha?.message
    const conteudo = textoDaResposta(mensagem?.content)
    if (!conteudo.trim()) {
      console.error('A API de IA concluiu sem conteúdo final.', {
        modelo: corpo.model ?? this.lerConexao().modelo,
        motivo: escolha?.finish_reason ?? null,
        tokensGerados: corpo.usage?.completion_tokens ?? null,
        tokensRaciocinio: corpo.usage?.completion_tokens_details?.reasoning_tokens ?? null,
      })
      if (escolha?.finish_reason === 'length') {
        throw new ErroModeloLinguagem(
          'O modelo atingiu o limite de saída durante o raciocínio e não gerou conteúdo final. Reduza o esforço de raciocínio ou escolha um modelo com maior limite de saída.',
          502,
        )
      }
      if (typeof mensagem?.refusal === 'string' && mensagem.refusal.trim()) {
        throw new ErroModeloLinguagem('O modelo recusou gerar uma resposta para esta solicitação.', 502)
      }
      throw new ErroModeloLinguagem('O modelo não retornou conteúdo. Verifique se o modelo escolhido aceita chat e saída estruturada.', 502)
    }
    try {
      const dados: unknown = JSON.parse(conteudo.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''))
      if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw new Error('Formato JSON inválido')
      return dados as Record<string, unknown>
    } catch (erro) {
      throw new ErroModeloLinguagem('O modelo não retornou um JSON válido. Tente novamente ou escolha outro modelo.', 502, { cause: erro })
    }
  }

  async *transmitir(mensagens: MensagemModelo[], opcoes: OpcoesGeracao = {}, sinal?: AbortSignal): AsyncGenerator<string> {
    const resposta = await this.chamar(mensagens, opcoes, true, sinal, false)
    if (!resposta.body) throw new ErroModeloLinguagem('A API de IA não iniciou a transmissão da resposta.', 502)

    const leitor = resposta.body.getReader()
    const decodificador = new TextDecoder()
    let buffer = ''
    let recebeuConteudo = false
    try {
      while (true) {
        const { done, value } = await leitor.read()
        buffer += decodificador.decode(value, { stream: !done })
        const eventos = buffer.split(/\r?\n\r?\n/)
        buffer = eventos.pop() ?? ''
        for (const evento of eventos) {
          const conteudo = this.conteudoDoEvento(evento)
          if (conteudo) {
            recebeuConteudo ||= Boolean(conteudo.trim())
            yield conteudo
          }
        }
        if (done) break
      }

      if (buffer.trim()) {
        const conteudo = this.conteudoDoEvento(buffer)
        if (conteudo) {
          recebeuConteudo ||= Boolean(conteudo.trim())
          yield conteudo
        }
      }
    } catch (erro) {
      if (erro instanceof Error && erro.name === 'TimeoutError') {
        throw new ErroModeloLinguagem('A API de IA demorou demais para responder. Tente novamente.', 504, { cause: erro })
      }
      throw erro
    } finally {
      leitor.releaseLock()
    }
    if (!recebeuConteudo) throw new ErroModeloLinguagem('A API de IA retornou uma resposta vazia.', 502)
  }

  private async chamar(
    mensagens: MensagemModelo[],
    opcoes: OpcoesGeracao,
    stream: boolean,
    sinal: AbortSignal | undefined,
    json: boolean,
  ): Promise<Response> {
    const conexao = this.lerConexao()
    await validarDestinoApi(conexao.url)
    const reduzirRaciocinio = json &&
      new URL(conexao.url).hostname.toLowerCase() === 'openrouter.ai' &&
      conexao.modelo.startsWith('dots-studio/dots-3-note-preview')
    let resposta: Response
    try {
      resposta = await this.fazerFetch(`${conexao.url.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${conexao.chave}`,
          'Content-Type': 'application/json',
          Accept: stream ? 'text/event-stream' : 'application/json',
        },
        signal: AbortSignal.any([AbortSignal.timeout(TIMEOUT_MS), ...(sinal ? [sinal] : [])]),
        redirect: 'error',
        body: JSON.stringify({
          model: conexao.modelo,
          messages: mensagens.map((m) => ({ role: m.papel, content: m.conteudo })),
          temperature: opcoes.temperatura ?? (stream ? 0.2 : 0),
          ...(opcoes.maximoTokens ? { max_tokens: opcoes.maximoTokens } : {}),
          stream,
          ...(json ? { response_format: { type: 'json_object' } } : {}),
          ...(reduzirRaciocinio
            ? { reasoning: { effort: 'low' } }
            : {}),
        }),
      })
    } catch (erro) {
      if (erro instanceof Error && erro.name === 'TimeoutError') {
        throw new ErroModeloLinguagem('A API de IA demorou demais para responder. Tente novamente.', 504, { cause: erro })
      }
      throw new ErroModeloLinguagem('Não foi possível conectar à API de IA. Confira a URL e a conexão de rede.', 503, { cause: erro })
    }

    if (!resposta.ok) {
      const mensagem = resposta.status === 401 || resposta.status === 403
        ? 'A API de IA recusou a chave cadastrada. Confira a conexão em Configurações › Inteligência artificial.'
        : resposta.status === 402
          ? 'O provedor recusou a solicitação por cobrança pendente ou saldo/créditos insuficientes. Confira faturamento, saldo e limites no painel do provedor.'
        : resposta.status === 404
          ? 'A API de IA não encontrou o endpoint ou modelo solicitado (HTTP 404). Confira se a URL é a base correta, sem /chat/completions, e se o modelo selecionado está disponível e aceita chat nesse provedor. Atualize a lista de modelos e selecione-o novamente.'
        : resposta.status === 413
          ? 'A solicitação enviada à API excedeu o limite de tamanho (HTTP 413). O edital, a pergunta ou as instruções podem estar grandes demais. Tente reduzir o conteúdo enviado; se persistir, confira o limite de requisição do provedor ou proxy.'
        : resposta.status === 429
          ? 'A API de IA limitou as requisições. Aguarde um pouco ou confira a cota da conta.'
          : `A API de IA respondeu HTTP ${resposta.status}. Confira o modelo e as configurações do provedor.`
      throw new ErroModeloLinguagem(mensagem, 503)
    }
    return resposta
  }

  private conteudoDoEvento(evento: string): string {
    for (const linha of evento.split(/\r?\n/)) {
      if (!linha.startsWith('data:')) continue
      const dados = linha.slice(5).trim()
      if (!dados || dados === '[DONE]') continue
      try {
        const corpo = JSON.parse(dados) as { choices?: { delta?: { content?: unknown } }[] }
        const conteudo = corpo.choices?.[0]?.delta?.content
        if (typeof conteudo === 'string') return conteudo
      } catch (erro) {
        throw new ErroModeloLinguagem('A API de IA enviou um evento de transmissão inválido.', 502, { cause: erro })
      }
    }
    return ''
  }
}
