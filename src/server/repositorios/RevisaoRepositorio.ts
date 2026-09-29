import type { AcaoRevisao, Revisao } from '../entidades.js'
import { Repositorio } from './repositorio.js'

export class RevisaoRepositorio extends Repositorio<Revisao, string, 'id' | 'criado_em'> {
  protected readonly tabela = 'revisao'
  protected readonly colunaCriacao = 'criado_em'

  /** Linha do tempo do edital (P04, bloco 4). */
  listarDoEdital(editalId: string): Revisao[] {
    return this.consultar('SELECT * FROM revisao WHERE edital_id = ? ORDER BY criado_em', editalId)
  }

  /** Quantos editais distintos receberam a ação desde o instante informado. */
  contarEditaisComAcaoDesde(acao: AcaoRevisao, instante: string): number {
    return this.escalar(
      'SELECT COUNT(DISTINCT edital_id) FROM revisao WHERE acao = ? AND criado_em >= ?',
      acao,
      instante,
    )
  }
}
