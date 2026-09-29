import type { Fonte } from '../entidades.js'
import { Repositorio } from './repositorio.js'

export class FonteRepositorio extends Repositorio<Fonte, string, 'id' | 'ativo'> {
  protected readonly tabela = 'fonte'
  protected readonly colunasBooleanas = ['ativo'] as const
  protected readonly ordemPadrao = 'nome'

  listarAtivas(): Fonte[] {
    return this.consultar('SELECT * FROM fonte WHERE ativo = 1 ORDER BY nome')
  }

  buscarPorNome(nome: string): Fonte | undefined {
    return this.consultarUm('SELECT * FROM fonte WHERE nome = ?', nome)
  }
}
