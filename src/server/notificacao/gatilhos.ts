import { CAMPOS_EDITAL, type NomeCampoEdital } from '../../shared/rotulos.js'
import type { Avaliacao, StatusEdital } from '../entidades.js'
import type { Repositorios } from '../repositorios/index.js'
import { Formato } from './formato.js'
import type { NotificacaoServico, ResultadoDisparo } from './servico.js'
import { NovoEditalFitAlto, type Destaque } from './tipos/E01NovoEditalFitAlto.js'
import { PrazoProximo } from './tipos/E02PrazoProximo.js'
import { VerificacaoNecessaria } from './tipos/E03VerificacaoNecessaria.js'
import { ResumoSemanal } from './tipos/E04ResumoSemanal.js'
import { EditalRetificado, type Mudanca } from './tipos/E05EditalRetificado.js'
import { FalhaColeta } from './tipos/E06FalhaColeta.js'

const DIA_MS = 86_400_000
// Status em que o edital ainda espera decisão ou inscrição (E02 e resumo semanal).
const STATUS_AGUARDANDO_PRAZO: readonly StatusEdital[] = ['ANALISADO', 'EM_REVISAO', 'APROVADO']

// Nota manual, quando existe, sobrescreve a calculada (§8).
export function notaEfetiva(avaliacao: Avaliacao): number | null {
  return avaliacao.nota_ajustada_manual ?? avaliacao.nota_fit
}

// Decide quando cada notificação deve sair, a partir dos dados do banco.
// Os métodos de evento são chamados por outras partes do sistema; os de rotina, pelo agendador.
export class GatilhosNotificacao {
  constructor(
    private readonly servico: NotificacaoServico,
    private readonly repositorios: Repositorios,
  ) {}

  // ---- Eventos ----

  /** E01 ou E03. Chamar ao concluir a avaliação de um edital. */
  async avaliacaoConcluida(editalId: string): Promise<ResultadoDisparo | null> {
    const edital = this.repositorios.edital.buscarPorId(editalId)
    const avaliacao = this.repositorios.avaliacao.ultimaDoEdital(editalId)
    if (!edital || !avaliacao) return null

    if (avaliacao.status_elegibilidade === 'INDETERMINADO') {
      return this.servico.disparar(new VerificacaoNecessaria(edital, avaliacao.criterios_indeterminados ?? []))
    }

    const nota = notaEfetiva(avaliacao)
    const { nota_minima } = this.repositorios.configAlerta.obter('E01').parametros
    if (avaliacao.status_elegibilidade === 'ELEGIVEL' && nota !== null && nota >= nota_minima) {
      return this.servico.disparar(new NovoEditalFitAlto(edital, avaliacao, nota, this.destaques(avaliacao)))
    }
    return null
  }

  /**
   * E05. Chamar depois de reprocessar um edital retificado, com a versão anterior já
   * gravada em edital_versao e a nova avaliação já calculada.
   */
  async editalRetificado(editalId: string): Promise<ResultadoDisparo | null> {
    const edital = this.repositorios.edital.buscarPorId(editalId)
    const versao = this.repositorios.editalVersao.ultimaDoEdital(editalId)
    if (!edital || !versao) return null
    const anterior = versao.dados

    const [atual, previa] = this.repositorios.avaliacao.ultimasDoEdital(editalId, 2)
    const elegibilidade = {
      antes: previa?.status_elegibilidade ?? null,
      agora: atual?.status_elegibilidade ?? null,
    }
    const nota = {
      antes: previa ? notaEfetiva(previa) : null,
      agora: atual ? notaEfetiva(atual) : null,
    }

    const { variacao_minima_nota } = this.repositorios.configAlerta.obter('E05').parametros
    const mudouNota =
      nota.antes !== null && nota.agora !== null
        ? Math.abs(nota.agora - nota.antes) > variacao_minima_nota
        : nota.antes !== nota.agora
    const mudouPrazo = anterior.prazo_inscricao !== edital.prazo_inscricao
    if (elegibilidade.antes === elegibilidade.agora && !mudouPrazo && !mudouNota) return null

    // Listas comparadas pelo conteúdo, não pela referência.
    const igual = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
    const mudancas: Mudanca[] = (Object.keys(CAMPOS_EDITAL) as NomeCampoEdital[])
      .filter((campo) => !igual(anterior[campo], edital[campo]))
      .map((campo) => ({
        campo: CAMPOS_EDITAL[campo].rotulo,
        antes: Formato.valorCampo(campo, anterior[campo] ?? null),
        agora: Formato.valorCampo(campo, edital[campo]),
      }))

    const marco = edital.hash_documento ?? edital.atualizado_em
    return this.servico.disparar(new EditalRetificado(edital, mudancas, elegibilidade, nota, marco))
  }

  /** E06. Chamar ao fim de cada execução de coleta de uma fonte. */
  async coletaFinalizada(fonteId: string): Promise<ResultadoDisparo | null> {
    const fonte = this.repositorios.fonte.buscarPorId(fonteId)
    if (!fonte) return null

    const { falhas_consecutivas } = this.repositorios.configAlerta.obter('E06').parametros
    const execucoes = this.repositorios.coletaExecucao.ultimasFinalizadasDaFonte(fonteId, 100)
    const fimSequencia = execucoes.findIndex((e) => e.status !== 'FALHA')
    const sequencia = fimSequencia === -1 ? execucoes : execucoes.slice(0, fimSequencia)
    if (sequencia.length < falhas_consecutivas) return null

    const primeiraFalha = sequencia[sequencia.length - 1]!
    return this.servico.disparar(new FalhaColeta(fonte, falhas_consecutivas, primeiraFalha.id))
  }

  // ---- Rotinas ----

  /** E02. Rotina diária: avisa editais cujo prazo está exatamente a N dias. */
  async verificarPrazos(hoje = new Date()): Promise<ResultadoDisparo[]> {
    const { dias_antecedencia } = this.repositorios.configAlerta.obter('E02').parametros

    const resultados: ResultadoDisparo[] = []
    for (const edital of this.repositorios.edital.listarComPrazo(STATUS_AGUARDANDO_PRAZO)) {
      const dias = Formato.diasAte(edital.prazo_inscricao!, hoje)
      if (!dias_antecedencia.includes(dias)) continue
      const avaliacao = this.repositorios.avaliacao.ultimaDoEdital(edital.id)
      const nota = avaliacao ? notaEfetiva(avaliacao) : null
      const indeterminados = avaliacao?.criterios_indeterminados ?? []
      resultados.push(await this.servico.disparar(new PrazoProximo(edital, dias, nota, indeterminados)))
    }
    return resultados
  }

  /** E04. Rotina semanal: panorama dos 7 dias até `fim`. */
  async resumoSemanal(fim = new Date()): Promise<ResultadoDisparo> {
    const { edital, avaliacao, revisao, fonte, coletaExecucao } = this.repositorios
    const inicio = new Date(fim.getTime() - 7 * DIA_MS)
    const desde = inicio.toISOString()

    // Editais coletados na semana, com a avaliação vigente de cada um.
    const avaliados = edital
      .listarCriadosDesde(desde)
      .map((e) => ({ edital: e, avaliacao: avaliacao.ultimaDoEdital(e.id) }))
      .filter((item): item is { edital: typeof item.edital; avaliacao: Avaliacao } => !!item.avaliacao)
    const comElegibilidade = (status: string) =>
      avaliados.filter((a) => a.avaliacao.status_elegibilidade === status).length

    const maioresOportunidades = avaliados
      .filter((a) => a.avaliacao.status_elegibilidade === 'ELEGIVEL' && notaEfetiva(a.avaliacao) !== null)
      .map((a) => ({
        nota: notaEfetiva(a.avaliacao)!,
        titulo: a.edital.titulo,
        orgao: a.edital.orgao_financiador,
        prazo: a.edital.prazo_inscricao,
      }))
      .sort((x, y) => y.nota - x.nota)
      .slice(0, 5)

    const prazosProximos = edital
      .listarComPrazo(STATUS_AGUARDANDO_PRAZO)
      .map((e) => ({ dias: Formato.diasAte(e.prazo_inscricao!, fim), titulo: e.titulo, status: e.status }))
      .filter((p) => p.dias >= 0 && p.dias <= 15)

    return this.servico.disparar(
      new ResumoSemanal({
        inicio,
        fim,
        numeros: {
          coletados: edital.contarCriadosDesde(desde),
          elegiveis: comElegibilidade('ELEGIVEL'),
          inelegiveis: comElegibilidade('INELEGIVEL'),
          indeterminados: comElegibilidade('INDETERMINADO'),
          aprovados: revisao.contarEditaisComAcaoDesde('APROVOU', desde),
          inscritos: revisao.contarEditaisComAcaoDesde('MARCOU_INSCRITO', desde),
        },
        maioresOportunidades,
        prazosProximos,
        pendencias: {
          aguardandoVerificacao: edital.contarPorStatus('EM_REVISAO'),
          aprovadosSemInscricao: edital.contarPorStatus('APROVADO'),
        },
        fontes: fonte.listarAtivas().map((f) => ({
          nome: f.nome,
          ultimoStatus: f.ultimo_status,
          ultimaColetaEm: f.ultima_coleta_em,
          itens: coletaExecucao.ultimaDaFonte(f.id)?.itens_coletados ?? null,
        })),
      }),
    )
  }

  // Os 3 critérios com maior contribuição para a nota (E01).
  private destaques(avaliacao: Avaliacao): Destaque[] {
    return [...(avaliacao.detalhamento_pontuacao ?? [])]
      .sort((x, y) => y.contribuicao - x.contribuicao)
      .slice(0, 3)
      .map((item) => ({
        nome: this.repositorios.criterio.buscarPorId(item.criterio_id)?.nome ?? 'Critério removido',
        contribuicao: item.contribuicao,
      }))
  }
}
