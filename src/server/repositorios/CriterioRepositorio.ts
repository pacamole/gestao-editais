import { transacao } from '../db/index.js'
import type { Criterio, TipoCriterio } from '../entidades.js'
import { Repositorio } from './repositorio.js'

export class CriterioRepositorio extends Repositorio<Criterio, string, 'id' | 'ativo' | 'ordem'> {
  protected readonly tabela = 'criterio'
  protected readonly colunasBooleanas = ['ativo'] as const
  protected readonly ordemPadrao = 'tipo, ordem, nome'

  listarPorTipo(tipo: TipoCriterio): Criterio[] {
    return this.consultar('SELECT * FROM criterio WHERE tipo = ? ORDER BY ordem, nome', tipo)
  }

  listarAtivos(tipo: TipoCriterio): Criterio[] {
    return this.consultar('SELECT * FROM criterio WHERE tipo = ? AND ativo = 1 ORDER BY ordem, nome', tipo)
  }

  /** P07 reordenar: grava a posição de cada critério conforme a ordem dos ids. */
  reordenar(ids: string[]): void {
    transacao(() => ids.forEach((id, posicao) => this.atualizar(id, { ordem: posicao })))
  }
}
