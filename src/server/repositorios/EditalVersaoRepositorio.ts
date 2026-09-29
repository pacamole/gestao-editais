import type { EditalVersao } from '../entidades.js'
import { Repositorio } from './repositorio.js'

export class EditalVersaoRepositorio extends Repositorio<EditalVersao, string, 'id' | 'criado_em'> {
  protected readonly tabela = 'edital_versao'
  protected readonly colunasJson = ['dados'] as const
  protected readonly colunaCriacao = 'criado_em'

  listarDoEdital(editalId: string): EditalVersao[] {
    return this.consultar('SELECT * FROM edital_versao WHERE edital_id = ? ORDER BY criado_em DESC', editalId)
  }

  ultimaDoEdital(editalId: string): EditalVersao | undefined {
    return this.consultarUm(
      'SELECT * FROM edital_versao WHERE edital_id = ? ORDER BY criado_em DESC LIMIT 1',
      editalId,
    )
  }
}
