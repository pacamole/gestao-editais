import type { Evidencia } from '../entidades.js'
import { Repositorio } from './repositorio.js'

export class EvidenciaRepositorio extends Repositorio<Evidencia, string, 'id'> {
  protected readonly tabela = 'evidencia'

  listarDoEdital(editalId: string): Evidencia[] {
    return this.consultar('SELECT * FROM evidencia WHERE edital_id = ? ORDER BY campo, pagina', editalId)
  }

  listarDoCampo(editalId: string, campo: string): Evidencia[] {
    return this.consultar('SELECT * FROM evidencia WHERE edital_id = ? AND campo = ? ORDER BY pagina', editalId, campo)
  }

  /** Remove as evidências de um edital, antes de reprocessar a extração. */
  excluirDoEdital(editalId: string): number {
    return this.executar('DELETE FROM evidencia WHERE edital_id = ?', editalId)
  }
}
