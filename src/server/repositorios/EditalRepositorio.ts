import type { Edital, StatusEdital } from '../dominio/entidades.js'
import type { ValorSql } from '../db/conexao.js'
import { Repositorio } from './repositorio.js'

export type ChavesDeduplicacao = Pick<Edital, 'hash_documento' | 'url_documento' | 'numero_edital' | 'orgao_financiador'>

// Critérios já resolvidos pelo service (datas calculadas, listas separadas): o repositório só monta o SQL.
export type FiltroListaEditais = {
  busca?: string
  status?: string[]
  elegibilidade?: string
  faixaFit?: "ALTO" | "MEDIO" | "BAIXO"
  modalidade?: string
  fonteId?: string
  prazoDe?: string
  prazoAte?: string
  /** prazo_inscricao >= data e status ainda em andamento */
  prazoAbertoDesde?: string
  /** criado_em >= instante */
  criadoDesde?: string
  /** prazo entre as duas datas (inclusive) e status ainda em andamento */
  prazoEntre?: [string, string]
}

// Linha da lista: o edital com a fonte e a avaliação vigente.
export type LinhaListaEdital = Edital & {
  fonte_nome: string | null
  status_elegibilidade: string | null
  nota_fit: number | null
  classificacao: string | null
  nota_ajustada_manual: number | null
}

// Nota vigente: o ajuste manual, quando existe, vale mais que a calculada.
const NOTA_OU_ZERO = "COALESCE(a.nota_ajustada_manual, a.nota_fit, 0)"
const NOTA = "COALESCE(a.nota_ajustada_manual, a.nota_fit)"
const EM_ANDAMENTO = "e.status NOT IN ('EXPIRADO', 'ENCERRADO', 'DESCARTADO', 'FORA_DO_PERFIL')"

const JUNCOES_LISTA = `
  FROM edital e
  LEFT JOIN fonte f ON e.fonte_id = f.id
  LEFT JOIN avaliacao a ON a.id = (
    SELECT id FROM avaliacao WHERE edital_id = e.id ORDER BY calculado_em DESC LIMIT 1
  )`

// Ordem da especificação: elegibilidade (elegível, indeterminado, inelegível, sem avaliação), nota de fit decrescente, prazo crescente.
const ORDEM_LISTA = `
  ORDER BY
    CASE
      WHEN a.status_elegibilidade = 'ELEGIVEL' THEN 1
      WHEN a.status_elegibilidade = 'INDETERMINADO' THEN 2
      WHEN a.status_elegibilidade = 'INELEGIVEL' THEN 3
      ELSE 4
    END ASC,
    COALESCE(a.nota_ajustada_manual, a.nota_fit, -1) DESC,
    CASE WHEN e.prazo_inscricao IS NULL THEN '9999-99-99' ELSE e.prazo_inscricao END ASC`

function montarWhere(filtro: FiltroListaEditais): { where: string; params: ValorSql[] } {
  const condicoes: string[] = []
  const params: ValorSql[] = []

  if (filtro.busca) {
    const termo = `%${filtro.busca.toLowerCase()}%`
    condicoes.push("(LOWER(e.titulo) LIKE ? OR LOWER(COALESCE(e.orgao_financiador, '')) LIKE ? OR LOWER(COALESCE(e.numero_edital, '')) LIKE ?)")
    params.push(termo, termo, termo)
  }
  if (filtro.status?.length === 1) {
    condicoes.push("e.status = ?")
    params.push(filtro.status[0]!)
  } else if (filtro.status && filtro.status.length > 1) {
    condicoes.push(`e.status IN (${filtro.status.map(() => '?').join(', ')})`)
    params.push(...filtro.status)
  } else {
    // Sem filtro de status, o que o filtro de relevância deixou de fora fica escondido (resgata-se pelo status).
    condicoes.push("e.status <> 'FORA_DO_PERFIL'")
  }
  if (filtro.elegibilidade) {
    condicoes.push("a.status_elegibilidade = ?")
    params.push(filtro.elegibilidade)
  }
  if (filtro.faixaFit === "ALTO") condicoes.push(`${NOTA_OU_ZERO} >= 70`)
  else if (filtro.faixaFit === "MEDIO") condicoes.push(`(${NOTA_OU_ZERO} >= 40 AND ${NOTA_OU_ZERO} < 70)`)
  else if (filtro.faixaFit === "BAIXO") condicoes.push(`(${NOTA_OU_ZERO} < 40 AND ${NOTA} IS NOT NULL)`)
  if (filtro.modalidade) {
    condicoes.push("e.modalidade = ?")
    params.push(filtro.modalidade)
  }
  if (filtro.fonteId) {
    condicoes.push("e.fonte_id = ?")
    params.push(filtro.fonteId)
  }
  if (filtro.prazoDe) {
    condicoes.push("e.prazo_inscricao >= ?")
    params.push(filtro.prazoDe)
  }
  if (filtro.prazoAte) {
    condicoes.push("e.prazo_inscricao <= ?")
    params.push(filtro.prazoAte)
  }
  if (filtro.prazoAbertoDesde) {
    condicoes.push(`(e.prazo_inscricao >= ? AND ${EM_ANDAMENTO})`)
    params.push(filtro.prazoAbertoDesde)
  }
  if (filtro.criadoDesde) {
    condicoes.push("e.criado_em >= ?")
    params.push(filtro.criadoDesde)
  }
  if (filtro.prazoEntre) {
    condicoes.push(`(e.prazo_inscricao >= ? AND e.prazo_inscricao <= ? AND ${EM_ANDAMENTO})`)
    params.push(...filtro.prazoEntre)
  }
  return { where: condicoes.length ? `WHERE ${condicoes.join(" AND ")}` : "", params }
}

export class EditalRepositorio extends Repositorio<
  Edital,
  string,
  'id' | 'status' | 'retificado' | 'criado_em' | 'atualizado_em' | 'tentativas_processamento'
> {
  protected readonly tabela = 'edital'
  protected readonly colunasJson = [
    'publico_alvo',
    'cnaes_aceitos',
    'portes_aceitos',
    'natureza_juridica_aceita',
    'abrangencia_geografica',
    'certidoes_exigidas',
    'areas_tematicas',
  ] as const
  protected readonly colunasBooleanas = [
    'exige_contrapartida',
    'exige_ict_parceira',
    'permite_submissao_multipla',
    'retificado',
  ] as const
  protected readonly colunaCriacao = 'criado_em'
  protected readonly colunaAtualizacao = 'atualizado_em'
  protected readonly ordemPadrao = 'criado_em DESC'

  /** Página da lista de editais com os filtros aplicados, e o total sem paginação. */
  listarFiltrado(filtro: FiltroListaEditais, limite: number, deslocamento: number): { itens: LinhaListaEdital[]; total: number } {
    const { where, params } = montarWhere(filtro)
    const total = this.escalar(`SELECT COUNT(*) ${JUNCOES_LISTA} ${where}`, ...params)
    const itens = this.consultar(
      `SELECT e.*, f.nome AS fonte_nome, a.status_elegibilidade, a.nota_fit, a.classificacao, a.nota_ajustada_manual
       ${JUNCOES_LISTA} ${where} ${ORDEM_LISTA} LIMIT ? OFFSET ?`,
      ...params,
      limite,
      deslocamento,
    ) as LinhaListaEdital[]
    return { itens, total }
  }

  /** Todos os editais do filtro, sem paginação (exportação). */
  listarParaExportacao(filtro: FiltroListaEditais): LinhaListaEdital[] {
    const { where, params } = montarWhere(filtro)
    return this.consultar(
      `SELECT e.*, f.nome AS fonte_nome, a.status_elegibilidade, a.nota_fit, a.classificacao, a.nota_ajustada_manual
       ${JUNCOES_LISTA} ${where} ${ORDEM_LISTA}`,
      ...params,
    ) as LinhaListaEdital[]
  }

  /** Fila do processamento automático: os editais coletados, do mais antigo ao mais novo. */
  listarParaProcessar(limite: number): Edital[] {
    return this.consultar("SELECT * FROM edital WHERE status = 'COLETADO' ORDER BY criado_em LIMIT ?", limite)
  }

  /** Editais que falharam, ainda com tentativas sobrando e parados desde antes de `antesDe`. */
  listarFalhasParaRepetir(maximoTentativas: number, antesDe: string): Edital[] {
    return this.consultar(
      "SELECT * FROM edital WHERE status = 'FALHA' AND tentativas_processamento < ? AND atualizado_em <= ? ORDER BY atualizado_em",
      maximoTentativas,
      antesDe,
    )
  }

  /** Editais presos em análise (o servidor reiniciou ou travou no meio do processamento). */
  listarEmAnaliseDesde(antesDe: string): Edital[] {
    return this.consultar("SELECT * FROM edital WHERE status = 'EM_ANALISE' AND atualizado_em <= ?", antesDe)
  }

  listarPorStatus(status: readonly StatusEdital[]): Edital[] {
    return this.consultar(
      `SELECT * FROM edital WHERE status IN (${Repositorio.marcadores(status)}) ORDER BY criado_em DESC`,
      ...status,
    )
  }

  /** Editais com prazo definido, nos status informados, do prazo mais próximo ao mais distante. */
  listarComPrazo(status: readonly StatusEdital[]): Edital[] {
    return this.consultar(
      `SELECT * FROM edital
       WHERE prazo_inscricao IS NOT NULL AND status IN (${Repositorio.marcadores(status)})
       ORDER BY prazo_inscricao`,
      ...status,
    )
  }

  /** Editais sem prazo, nos status informados, sem alteração desde o instante (ISO) informado. */
  listarSemPrazoParadosDesde(status: readonly StatusEdital[], antesDe: string): Edital[] {
    return this.consultar(
      `SELECT * FROM edital
       WHERE prazo_inscricao IS NULL AND atualizado_em <= ? AND status IN (${Repositorio.marcadores(status)})`,
      antesDe,
      ...status,
    )
  }

  listarCriadosDesde(instante: string): Edital[] {
    return this.consultar('SELECT * FROM edital WHERE criado_em >= ? ORDER BY criado_em DESC', instante)
  }

  contarPorStatus(status: StatusEdital): number {
    return this.contarOnde('status = ?', status)
  }

  contarCriadosDesde(instante: string): number {
    return this.contarOnde('criado_em >= ?', instante)
  }

  /** §9 Deduplicação: mesmo hash, ou mesma URL do documento, ou mesmo número + órgão. */
  /** Chamada de uma fonte pela identidade que a própria fonte dá a ela (ex.: id na API da FINEP). */
  buscarPorIdExterno(fonteId: string, idExterno: string): Edital | undefined {
    return this.consultarUm('SELECT * FROM edital WHERE fonte_id = ? AND id_externo = ? LIMIT 1', fonteId, idExterno)
  }

  buscarPorOrigem(url: string): Edital | undefined {
    return this.consultarUm('SELECT * FROM edital WHERE url_original = ? LIMIT 1', url)
  }

  buscarDuplicado(chaves: ChavesDeduplicacao): Edital | undefined {
    return this.consultarUm(
      `SELECT * FROM edital
       WHERE (hash_documento IS NOT NULL AND hash_documento = ?)
          OR (url_documento IS NOT NULL AND url_documento = ?)
          OR (numero_edital IS NOT NULL AND orgao_financiador IS NOT NULL
              AND numero_edital = ? AND orgao_financiador = ?)
       LIMIT 1`,
      chaves.hash_documento,
      chaves.url_documento,
      chaves.numero_edital,
      chaves.orgao_financiador,
    )
  }
}
