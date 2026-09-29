import type { Edital, StatusEdital } from '../entidades.js'
import { Repositorio } from './repositorio.js'

export type ChavesDeduplicacao = Pick<Edital, 'hash_documento' | 'url_documento' | 'numero_edital' | 'orgao_financiador'>

export class EditalRepositorio extends Repositorio<
  Edital,
  string,
  'id' | 'status' | 'retificado' | 'criado_em' | 'atualizado_em'
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
