import type { Edital, StatusEdital } from '../dominio/entidades.js'
import { ErroNegocio, ErroRegraNegocio, ErroServicoExterno } from '../dominio/erros.js'
import { MOTIVO_PERFIL_PROVISORIO, perfilProvisorio } from '../dominio/perfil.js'
import { avaliarRelevancia } from '../dominio/relevancia.js'
import { AVISO_PAGINAS_SEM_TEXTO } from '../dominio/textoEdital.js'
import { ehMarcadorDeTextoPdf } from '../integracoes/pdf.js'
import { ErroModeloLinguagem } from '../portas/ModeloLinguagemPorta.js'
import type { Repositorios } from '../repositorios/index.js'
import { podeTransicionarSistema } from '../../shared/statusEdital.js'
import type { ExtracaoResposta } from '../../shared/tipos/edital.js'
import type { StatusElegibilidade } from '../../shared/tipos/dominio.js'
import type { AvaliacaoServico } from './AvaliacaoServico.js'
import type { ExtracaoServico } from './ExtracaoServico.js'
import type { TriagemElegibilidadeServico } from './TriagemElegibilidadeServico.js'

type RepositoriosProcessamento = Pick<Repositorios, 'edital' | 'perfilEmpresa' | 'fonte' | 'revisao'>

// O que o processamento avisa quando termina (quem decide se vira e-mail é o módulo de notificações).
export interface EventosProcessamento {
  avaliacaoConcluida(editalId: string): Promise<unknown>
  editalRetificado(editalId: string): Promise<unknown>
}

export const MAXIMO_TENTATIVAS = 3
const ESPERA_NOVA_TENTATIVA_MIN = 15
const INTERROMPIDO_APOS_MIN = 30
const EDITAIS_POR_RODADA = 3
const LIMITE_AVISO_PERFIL = 500
// Status em que erro_processamento pode ser falha de leitura. Nos demais ele explica outra coisa
// (fora do perfil, expirado, perfil provisório) e uma leitura bem-sucedida não o desmente.
const STATUS_COM_FALHA_DE_LEITURA: readonly StatusEdital[] = ['FALHA', 'ANALISADO', 'EM_REVISAO', 'APROVADO']

export type ResultadoProcessamento = { id: string; status: StatusEdital; motivo?: string }
export type ResumoRodada = { processados: number; aguardandoPerfil: number }

const mensagemDe = (erro: unknown) => (erro instanceof Error && erro.message ? erro.message : String(erro))

// Falha que pode passar sozinha (IA fora do ar, rede) vale nova tentativa; a que não passa (edital sem texto) não.
function falhaTransitoria(erro: unknown): boolean {
  if (erro instanceof ErroModeloLinguagem) return erro.statusCode >= 500
  if (erro instanceof ErroServicoExterno) return true
  if (erro instanceof ErroNegocio) return false
  return true
}

/**
 * Leva um edital coletado pela triagem de elegibilidade, registra o fit inicial e avisa quem acompanha.
 *
 *   COLETADO → FORA_DO_PERFIL (coleta automática que o filtro de relevância dispensa)
 *   COLETADO → EM_ANALISE → ANALISADO (elegível ou não) | EM_REVISAO (faltou dado) | FALHA (tenta de novo)
 *
 * Um edital por vez (o modelo local não atende vários), na ordem de chegada.
 */
export class ProcessamentoEditalServico {
  private fila: Promise<unknown> = Promise.resolve()

  constructor(
    private readonly repos: RepositoriosProcessamento,
    private readonly extracao: Pick<ExtracaoServico, 'extrairDados' | 'lerUrl'>,
    private readonly triagem: Pick<TriagemElegibilidadeServico, 'analisar'>,
    private readonly avaliacao: Pick<AvaliacaoServico, 'registrar' | 'registrarTriagem'>,
    private readonly eventos: EventosProcessamento,
    private readonly termosExcludentes: () => string[] = () => [],
    private readonly agora: () => Date = () => new Date(),
  ) {}

  /** Entra na fila de processamento. Seguro chamar mais de uma vez: só processa edital ainda COLETADO. */
  processar(editalId: string): Promise<ResultadoProcessamento | null> {
    const execucao = this.fila.then(() => this.executar(editalId))
    this.fila = execucao.catch(() => undefined)
    return execucao
  }

  /** Rodada da tarefa agendada: recupera o que ficou preso, repete falhas antigas e processa a fila. */
  async processarPendentes(): Promise<ResumoRodada> {
    this.recuperarInterrompidos()
    this.repetirFalhas()

    const resumo: ResumoRodada = { processados: 0, aguardandoPerfil: 0 }
    const perfil = this.repos.perfilEmpresa.obter()
    if (!perfil || perfilProvisorio(perfil)) {
      const esperando = this.repos.edital.listarParaProcessar(LIMITE_AVISO_PERFIL)
      for (const edital of esperando) this.avisarPerfilProvisorio(edital)
      resumo.aguardandoPerfil = esperando.length
      return resumo
    }

    for (const edital of this.repos.edital.listarParaProcessar(EDITAIS_POR_RODADA)) {
      const resultado = await this.processar(edital.id)
      if (resultado && resultado.status !== 'COLETADO') resumo.processados++
    }
    return resumo
  }

  /**
   * Reavalia um edital já analisado depois de uma edição de campos ou do perfil, sem chamar a IA.
   * Ajusta ANALISADO ↔ EM_REVISAO conforme o resultado; não mexe em status de decisão (aprovado etc.).
   */
  reavaliar(editalId: string): ResultadoProcessamento | null {
    const edital = this.repos.edital.buscarPorId(editalId)
    const perfil = this.repos.perfilEmpresa.obter()
    if (!edital || !perfil || perfilProvisorio(perfil)) return null
    if (edital.status !== 'ANALISADO' && edital.status !== 'EM_REVISAO' && edital.status !== 'APROVADO') return null

    const resultado = this.avaliacao.registrar(editalId)
    let status: StatusEdital = edital.status
    if (status === 'ANALISADO' || status === 'EM_REVISAO') {
      const alvo: StatusEdital = resultado.status_elegibilidade === 'INDETERMINADO' ? 'EM_REVISAO' : 'ANALISADO'
      if (alvo !== status) status = this.mover(edital, alvo).status
    }
    return { id: editalId, status }
  }

  /** Análise profunda: extrai campos do documento e recalcula a avaliação com os eliminatórios. */
  async lerSobDemanda(editalId: string, origem: 'TEXTO' | 'URL'): Promise<ExtracaoResposta> {
    const resposta = origem === 'TEXTO' ? await this.extracao.extrairDados(editalId) : await this.extracao.lerUrl(editalId)
    await this.registrarLeitura(editalId, true)
    return { ...resposta, edital: this.repos.edital.buscarPorId(editalId) ?? resposta.edital }
  }

  // A leitura deu certo: tira o aviso da falha anterior. Edital em FALHA nem precisava esperar a nova tentativa.
  private async registrarLeitura(editalId: string, temCamposNovos: boolean): Promise<void> {
    const edital = this.repos.edital.buscarPorId(editalId)
    if (!edital || !STATUS_COM_FALHA_DE_LEITURA.includes(edital.status)) return

    const aviso = edital.erro_processamento === AVISO_PAGINAS_SEM_TEXTO ? AVISO_PAGINAS_SEM_TEXTO : null
    if (edital.status === 'FALHA') {
      const perfil = this.repos.perfilEmpresa.obter()
      if (!perfil || perfilProvisorio(perfil)) return
      await this.concluir(this.mover(edital, 'EM_ANALISE', { erro_processamento: aviso }), aviso)
      return
    }

    if (edital.erro_processamento !== aviso) this.repos.edital.atualizar(editalId, { erro_processamento: aviso })
    if (temCamposNovos) this.reavaliar(editalId)
  }

  /**
   * Relê com a IA os editais já analisados, preenchendo só os campos vazios, e os reavalia.
   * Não avisa ninguém: não são editais novos.
   */
  async relerAnalisados(aoLer: (edital: Edital, resultado: ExtracaoResposta | Error) => void = () => {}): Promise<number> {
    let relidos = 0
    for (const edital of this.repos.edital.listarPorStatus(['ANALISADO', 'EM_REVISAO', 'APROVADO'])) {
      if (!edital.texto_extraido?.trim() || ehMarcadorDeTextoPdf(edital.texto_extraido)) continue
      try {
        aoLer(edital, await this.lerSobDemanda(edital.id, 'TEXTO'))
        relidos++
      } catch (erro) {
        aoLer(edital, erro instanceof Error ? erro : new Error(String(erro)))
      }
    }
    return relidos
  }

  /** Reavalia todos os editais já analisados (depois de mudar o perfil). Devolve quantos. */
  reavaliarAtivos(): number {
    let total = 0
    for (const edital of this.repos.edital.listarPorStatus(['ANALISADO', 'EM_REVISAO', 'APROVADO'])) {
      if (this.reavaliar(edital.id)) total++
    }
    return total
  }

  // ---- Um edital ----

  private async executar(editalId: string): Promise<ResultadoProcessamento | null> {
    const edital = this.repos.edital.buscarPorId(editalId)
    if (!edital || edital.status !== 'COLETADO') return null

    const perfil = this.repos.perfilEmpresa.obter()
    if (!perfil || perfilProvisorio(perfil)) {
      this.avisarPerfilProvisorio(edital)
      return { id: editalId, status: 'COLETADO', motivo: MOTIVO_PERFIL_PROVISORIO }
    }

    const fora = this.foraDoPerfil(edital, perfil)
    if (fora) {
      this.mover(edital, 'FORA_DO_PERFIL', { erro_processamento: fora, processado_em: this.agora().toISOString() })
      return { id: editalId, status: 'FORA_DO_PERFIL', motivo: fora }
    }

    this.mover(edital, 'EM_ANALISE', { erro_processamento: null })

    // 1. Triagem por IA. Se falhar, repete depois; esgotadas as tentativas, pede revisão em vez de presumir elegibilidade.
    let aviso: string | null = null
    let statusTriagem: StatusElegibilidade | null = null
    try {
      statusTriagem = (await this.triagem.analisar(edital.id)).status
    } catch (erro) {
      const motivo = mensagemDe(erro)
      const tentativas = edital.tentativas_processamento + 1
      const transitoria = falhaTransitoria(erro)
      if (transitoria && tentativas < MAXIMO_TENTATIVAS) {
        console.warn(`[processamento] ${edital.titulo}: leitura por IA falhou (${tentativas}/${MAXIMO_TENTATIVAS}): ${motivo}`)
        const falho = this.mover(this.recarregar(edital), 'FALHA', {
          erro_processamento: motivo,
          tentativas_processamento: tentativas,
          processado_em: this.agora().toISOString(),
        })
        return { id: editalId, status: falho.status, motivo }
      }
      aviso = transitoria ? `A leitura por IA falhou ${tentativas} vezes (${motivo}). Confira e complete os dados à mão.` : motivo
      statusTriagem = 'INDETERMINADO'
    }

    return this.concluir(edital, aviso, statusTriagem)
  }

  // Depois da leitura (ou da desistência dela): avalia, define o status final e avisa quem acompanha.
  private async concluir(edital: Edital, aviso: string | null, statusTriagem: StatusElegibilidade | null = null): Promise<ResultadoProcessamento> {
    const editalId = edital.id

    // 2. Registra a decisão da triagem; os eliminatórios serão recalculados na análise profunda.
    let status: StatusEdital
    try {
      const resultado = statusTriagem
        ? this.avaliacao.registrarTriagem(editalId, statusTriagem)
        : this.avaliacao.registrar(editalId)
      status = resultado.status_elegibilidade === 'INDETERMINADO' ? 'EM_REVISAO' : 'ANALISADO'
      this.mover(this.recarregar(edital), status, {
        erro_processamento: aviso,
        tentativas_processamento: 0,
        processado_em: this.agora().toISOString(),
      })
    } catch (erro) {
      const motivo = mensagemDe(erro)
      console.error(`[processamento] ${edital.titulo}: avaliação falhou: ${motivo}`)
      const falho = this.mover(this.recarregar(edital), 'FALHA', {
        erro_processamento: motivo,
        tentativas_processamento: edital.tentativas_processamento + 1,
        processado_em: this.agora().toISOString(),
      })
      return { id: editalId, status: falho.status, motivo }
    }

    // 3. Avisos (e-mail). Um problema aqui não desfaz o processamento.
    await this.avisar(editalId)
    return { id: editalId, status, motivo: aviso ?? undefined }
  }

  // O filtro vale só para o que chega sozinho, e nunca de novo para o que o usuário já resgatou.
  private foraDoPerfil(edital: Edital, perfil: Parameters<typeof avaliarRelevancia>[1]): string | null {
    const fonte = this.repos.fonte.buscarPorId(edital.fonte_id)
    if (fonte?.tipo !== 'SCRAPER' && fonte?.tipo !== 'RSS') return null
    if (this.repos.revisao.listarDoEdital(edital.id).some((r) => r.acao === 'RESGATOU')) return null
    const resultado = avaliarRelevancia(edital, perfil, this.termosExcludentes())
    return resultado.relevante ? null : resultado.motivo
  }

  private async avisar(editalId: string): Promise<void> {
    try {
      const edital = this.repos.edital.buscarPorId(editalId)
      if (edital?.retificado) await this.eventos.editalRetificado(editalId)
      else await this.eventos.avaliacaoConcluida(editalId)
    } catch (erro) {
      console.error('[processamento] falha ao avisar sobre o edital:', erro)
    }
  }

  // ---- Fila ----

  private avisarPerfilProvisorio(edital: Edital): void {
    if (edital.erro_processamento !== MOTIVO_PERFIL_PROVISORIO) {
      this.repos.edital.atualizar(edital.id, { erro_processamento: MOTIVO_PERFIL_PROVISORIO })
    }
  }

  // O servidor reiniciou no meio de um processamento: conta como falha e entra na fila de repetição.
  private recuperarInterrompidos(): void {
    const limite = new Date(this.agora().getTime() - INTERROMPIDO_APOS_MIN * 60_000).toISOString()
    for (const edital of this.repos.edital.listarEmAnaliseDesde(limite)) {
      this.mover(edital, 'FALHA', {
        erro_processamento: 'O processamento foi interrompido; nova tentativa em seguida.',
        tentativas_processamento: edital.tentativas_processamento + 1,
      })
    }
  }

  private repetirFalhas(): void {
    const limite = new Date(this.agora().getTime() - ESPERA_NOVA_TENTATIVA_MIN * 60_000).toISOString()
    for (const edital of this.repos.edital.listarFalhasParaRepetir(MAXIMO_TENTATIVAS, limite)) {
      this.mover(edital, 'COLETADO')
    }
  }

  private recarregar(edital: Edital): Edital {
    return this.repos.edital.buscarPorId(edital.id) ?? edital
  }

  private mover(edital: Edital, para: StatusEdital, extras: Partial<Edital> = {}): Edital {
    if (!podeTransicionarSistema(edital.status, para)) {
      throw new ErroRegraNegocio(`Mudança de status não permitida: ${edital.status} → ${para}.`)
    }
    return this.repos.edital.atualizar(edital.id, { status: para, ...extras })!
  }
}
