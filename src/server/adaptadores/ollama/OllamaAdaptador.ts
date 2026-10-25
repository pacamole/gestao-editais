import {
  ErroModeloLinguagem,
  type MensagemModelo,
  type ModeloLinguagemPorta,
  type OpcoesGeracao,
} from '../../portas/ModeloLinguagemPorta.js'
import { cabecalhosOllama, enderecoOllama, type ConexaoOllama } from './conexao.js'

const TIMEOUT_MS = 600_000
const CONTEXTO_TOKENS = 8192
const MAXIMO_TOKENS_PADRAO = 2048

type RespostaOllama = {
  message?: { content?: unknown }
  done?: boolean
}

type Pedido = {
  stream: boolean
  json?: boolean
  temperatura: number
  maximoTokens?: number
  mensagens: MensagemModelo[]
  sinal?: AbortSignal
}

// 401/403: o servidor recusou a chave de API (ou a falta dela).
function erroDeAcesso(status: number): ErroModeloLinguagem | null {
  if (status !== 401 && status !== 403) return null
  return new ErroModeloLinguagem('O Ollama Cloud recusou a chave de API. Confira em Configurações › Inteligência artificial.', 503)
}

// Implementa a porta falando com o Ollama (local ou Cloud). A conexão é lida a cada uso,
// então mudar a configuração vale sem reiniciar o servidor.
export class OllamaAdaptador implements ModeloLinguagemPorta {
  constructor(
    private readonly lerConexao: () => ConexaoOllama,
    private readonly fazerFetch: typeof fetch = fetch,
  ) {}

  async gerarJson(mensagens: MensagemModelo[], opcoes: OpcoesGeracao = {}): Promise<Record<string, unknown>> {
    const resposta = await this.chamar({
      stream: false,
      json: true,
      temperatura: opcoes.temperatura ?? 0,
      maximoTokens: opcoes.maximoTokens,
      mensagens,
    })

    let conteudo: unknown
    try {
      const corpo = (await resposta.json()) as RespostaOllama
      conteudo = corpo.message?.content
      if (typeof conteudo !== 'string' || !conteudo.trim()) throw new Error('Resposta vazia')
    } catch (erro) {
      throw new ErroModeloLinguagem('O Ollama retornou uma resposta vazia ou inválida.', 502, { cause: erro })
    }

    try {
      // Mesmo com format: 'json', modelos do Ollama Cloud podem cercar a resposta com ```json ... ```.
      const dados: unknown = JSON.parse(conteudo.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''))
      if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw new Error('Formato JSON inválido')
      return dados as Record<string, unknown>
    } catch (erro) {
      throw new ErroModeloLinguagem('Não foi possível interpretar os dados estruturados retornados pelo Ollama.', 502, { cause: erro })
    }
  }

  async *transmitir(mensagens: MensagemModelo[], opcoes: OpcoesGeracao = {}, sinal?: AbortSignal): AsyncGenerator<string> {
    const resposta = await this.chamar({
      stream: true,
      temperatura: opcoes.temperatura ?? 0.2,
      maximoTokens: opcoes.maximoTokens,
      mensagens,
      sinal,
    })

    if (!resposta.body) {
      throw new ErroModeloLinguagem('O Ollama não iniciou a transmissão da resposta. Tente novamente.', 502)
    }

    const leitor = resposta.body.getReader()
    const decodificador = new TextDecoder()
    let buffer = ''
    let recebeuConteudo = false

    try {
      while (true) {
        const { done, value } = await leitor.read()
        buffer += decodificador.decode(value, { stream: !done })
        const linhas = buffer.split('\n')
        buffer = linhas.pop() ?? ''

        for (const linha of linhas) {
          if (!linha.trim()) continue
          const evento = JSON.parse(linha) as RespostaOllama
          const conteudo = evento.message?.content
          if (typeof conteudo === 'string' && conteudo) {
            recebeuConteudo ||= Boolean(conteudo.trim())
            yield conteudo
          }
        }

        if (done) break
      }

      if (buffer.trim()) {
        const evento = JSON.parse(buffer) as RespostaOllama
        const conteudo = evento.message?.content
        if (typeof conteudo === 'string' && conteudo) {
          recebeuConteudo ||= Boolean(conteudo.trim())
          yield conteudo
        }
      }
    } catch (erro) {
      if (erro instanceof Error && erro.name === 'TimeoutError') {
        throw new ErroModeloLinguagem('O Ollama demorou demais para responder. Tente novamente.', 504, { cause: erro })
      }
      throw erro
    } finally {
      leitor.releaseLock()
    }

    if (!recebeuConteudo) {
      throw new ErroModeloLinguagem('O Ollama retornou uma resposta vazia. Tente novamente.', 502)
    }
  }

  private async chamar(pedido: Pedido): Promise<Response> {
    const conexao = this.lerConexao()
    let resposta: Response
    try {
      resposta = await this.fazerFetch(enderecoOllama(conexao, '/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...cabecalhosOllama(conexao) },
        signal: AbortSignal.any([AbortSignal.timeout(TIMEOUT_MS), ...(pedido.sinal ? [pedido.sinal] : [])]),
        body: JSON.stringify({
          model: conexao.modelo,
          stream: pedido.stream,
          keep_alive: '5m',
          ...(pedido.json ? { format: 'json' } : {}),
          options: {
            temperature: pedido.temperatura,
            num_ctx: CONTEXTO_TOKENS,
            num_predict: pedido.maximoTokens ?? MAXIMO_TOKENS_PADRAO,
          },
          messages: pedido.mensagens.map((m) => ({ role: m.papel, content: m.conteudo })),
        }),
      })
    } catch (erro) {
      if (erro instanceof Error && erro.name === 'TimeoutError') {
        throw new ErroModeloLinguagem('O Ollama demorou demais para responder. Tente novamente.', 504, { cause: erro })
      }
      throw new ErroModeloLinguagem(
        'Não foi possível conectar ao Ollama. Verifique se ele está em execução e tente novamente.',
        503,
        { cause: erro },
      )
    }

    if (!resposta.ok) {
      throw (
        erroDeAcesso(resposta.status) ??
        new ErroModeloLinguagem(`O Ollama retornou HTTP ${resposta.status}. Confirme se o modelo ${conexao.modelo} está disponível.`, 503)
      )
    }
    return resposta
  }
}
