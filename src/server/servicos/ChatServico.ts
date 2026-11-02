import { novoId, transacao } from '../db/index.js'
import { ErroConflito, ErroLimiteExcedido, ErroNaoEncontrado, ErroValidacao } from '../dominio/erros.js'
import { ErroModeloLinguagem, type ModeloLinguagemPorta } from '../portas/ModeloLinguagemPorta.js'
import type { Repositorios } from '../repositorios/index.js'
import { inicioDoDia } from '../../shared/datas.js'
import type { EventoChat, HistoricoChatResposta } from '../../shared/tipos/chat.js'
import { caracteresDisponiveis, contextoParaPergunta } from './ia/contextoEdital.js'
import { mensagensDeChat } from './ia/promptsChat.js'

type RepositoriosChat = Pick<Repositorios, 'edital' | 'conversa' | 'mensagem' | 'perfilEmpresa'>

const MAXIMO_CARACTERES_PERGUNTA = 2000
// O pedido além do edital: instruções e perfil (~1.000), histórico e pergunta (~1.700) e a resposta (2.048).
const RESERVA_TOKENS = 4_800

export type PedidoPergunta = { editalId: string; usuarioId: string; pergunta: unknown }

// Quem recebe a resposta (o controller escreve no HTTP; o service não sabe disso).
export type DestinoResposta = {
  /** Chamado uma única vez, depois de validar o pedido e antes do primeiro evento. */
  aoIniciar(): void
  aoEvento(evento: EventoChat): void
  /** Aborta a geração quando o cliente desconecta. */
  sinal: AbortSignal
}

// Perguntas sobre um edital, com limite diário por usuário e histórico por conversa.
export class ChatServico {
  // Uma pergunta por vez: o modelo local não atende várias ao mesmo tempo.
  private fila: Promise<unknown> = Promise.resolve()

  constructor(
    private readonly repos: RepositoriosChat,
    private readonly modelo: ModeloLinguagemPorta,
    private readonly lerLimiteDiario: () => number,
  ) {}

  historico(editalId: string, usuarioId: string): HistoricoChatResposta {
    this.buscarEdital(editalId)
    const conversa = this.repos.conversa.buscarDoUsuario(editalId, usuarioId)
    const limite = this.lerLimiteDiario()
    return {
      mensagens: conversa ? this.repos.mensagem.listarDaConversa(conversa.id) : [],
      limite,
      restantes: Math.max(0, limite - this.perguntasDeHoje(usuarioId)),
    }
  }

  limpar(editalId: string, usuarioId: string): void {
    this.buscarEdital(editalId)
    const conversa = this.repos.conversa.buscarDoUsuario(editalId, usuarioId)
    if (conversa) this.repos.mensagem.excluirDaConversa(conversa.id)
  }

  perguntar(pedido: PedidoPergunta, destino: DestinoResposta): Promise<void> {
    const execucao = this.fila.then(() => this.executar(pedido, destino))
    this.fila = execucao.catch(() => undefined)
    return execucao
  }

  private async executar({ editalId, usuarioId, pergunta }: PedidoPergunta, destino: DestinoResposta): Promise<void> {
    const edital = this.buscarEdital(editalId)
    if (typeof pergunta !== 'string' || !pergunta.trim()) throw new ErroValidacao('Digite uma pergunta sobre o edital.')
    if (pergunta.trim().length > MAXIMO_CARACTERES_PERGUNTA) {
      throw new ErroValidacao('A pergunta deve ter no máximo 2.000 caracteres.')
    }
    const textoEdital = edital.texto_extraido
    if (!textoEdital?.trim()) throw new ErroConflito('Este edital ainda não tem texto extraído para consultar.')

    const limite = this.lerLimiteDiario()
    const feitasHoje = this.perguntasDeHoje(usuarioId)
    if (feitasHoje >= limite) {
      throw new ErroLimiteExcedido('Você atingiu o limite diário de perguntas do chat.', { limite, restantes: 0 })
    }

    const texto = pergunta.trim()
    const conversaExistente = this.repos.conversa.buscarDoUsuario(edital.id, usuarioId)
    const historico = conversaExistente ? this.repos.mensagem.ultimasDaConversa(conversaExistente.id, 6) : []

    const contexto = contextoParaPergunta(
      edital.id,
      textoEdital,
      texto,
      caracteresDisponiveis(this.modelo.limiteDeContexto(), RESERVA_TOKENS),
    )
    destino.aoIniciar()
    destino.aoEvento({
      tipo: 'status',
      mensagem: contexto.completo
        ? 'Enviando o edital completo ao Ollama. A resposta pode demorar um pouco mais…'
        : 'O edital é longo: enviando ao Ollama as partes ligadas à sua pergunta…',
    })

    let conteudo = ''
    try {
      const mensagens = mensagensDeChat(
        contexto,
        texto,
        historico.map(({ papel, conteudo: c }) => ({ papel, conteudo: c })),
        this.repos.perfilEmpresa.obter() ?? null,
      )
      for await (const trecho of this.modelo.transmitir(mensagens, undefined, destino.sinal)) {
        conteudo += trecho
        destino.aoEvento({ tipo: 'trecho', conteudo: trecho })
      }
    } catch (erro) {
      if (destino.sinal.aborted) return
      console.error('Falha ao gerar resposta do chat:', erro)
      destino.aoEvento({
        tipo: 'erro',
        mensagem: erro instanceof ErroModeloLinguagem ? erro.message : 'Não foi possível obter uma resposta do assistente.',
      })
      return
    }

    const agoraIso = new Date().toISOString()
    const conversa = transacao(() => {
      const atual =
        conversaExistente ?? this.repos.conversa.inserir({ id: novoId(), edital_id: edital.id, usuario_id: usuarioId })
      this.repos.mensagem.inserir({ id: novoId(), conversa_id: atual.id, papel: 'USUARIO', conteudo: texto })
      this.repos.mensagem.inserir({ id: novoId(), conversa_id: atual.id, papel: 'ASSISTENTE', conteudo })
      this.repos.conversa.atualizar(atual.id, { atualizada_em: agoraIso })
      return atual
    })

    destino.aoEvento({
      tipo: 'concluido',
      mensagens: this.repos.mensagem.listarDaConversa(conversa.id),
      limite,
      restantes: Math.max(0, limite - (feitasHoje + 1)),
    })
  }

  private perguntasDeHoje(usuarioId: string): number {
    return this.repos.mensagem.contarPerguntasDoUsuarioDesde(usuarioId, inicioDoDia())
  }

  private buscarEdital(editalId: string) {
    const edital = this.repos.edital.buscarPorId(editalId)
    if (!edital) throw new ErroNaoEncontrado('Edital não encontrado.')
    return edital
  }
}
