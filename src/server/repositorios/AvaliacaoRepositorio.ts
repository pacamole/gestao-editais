import type { Avaliacao } from '../entidades.js'
import { Repositorio } from './repositorio.js'

// Histórico: cada cálculo é uma nova linha. A avaliação vigente é a mais recente.
export class AvaliacaoRepositorio extends Repositorio<Avaliacao, string, 'id' | 'calculado_em'> {
  protected readonly tabela = 'avaliacao'
  protected readonly colunasJson = ['criterios_violados', 'criterios_indeterminados', 'detalhamento_pontuacao'] as const
  protected readonly colunaCriacao = 'calculado_em'

  ultimaDoEdital(editalId: string): Avaliacao | undefined {
    return this.ultimasDoEdital(editalId, 1)[0]
  }

  ultimasDoEdital(editalId: string, limite: number): Avaliacao[] {
    return this.consultar(
      'SELECT * FROM avaliacao WHERE edital_id = ? ORDER BY calculado_em DESC LIMIT ?',
      editalId,
      limite,
    )
  }
}
