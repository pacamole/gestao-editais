import type { ColetaExecucao } from '../entidades.js'
import { Repositorio } from './repositorio.js'

export class ColetaExecucaoRepositorio extends Repositorio<
  ColetaExecucao,
  string,
  'id' | 'iniciada_em' | 'itens_coletados'
> {
  protected readonly tabela = 'coleta_execucao'
  protected readonly colunaCriacao = 'iniciada_em'

  /** P08: log das últimas execuções, incluindo a em andamento. */
  ultimasDaFonte(fonteId: string, limite = 10): ColetaExecucao[] {
    return this.consultar(
      'SELECT * FROM coleta_execucao WHERE fonte_id = ? ORDER BY iniciada_em DESC LIMIT ?',
      fonteId,
      limite,
    )
  }

  /** Execuções já concluídas, da mais recente para a mais antiga. */
  ultimasFinalizadasDaFonte(fonteId: string, limite: number): ColetaExecucao[] {
    return this.consultar(
      'SELECT * FROM coleta_execucao WHERE fonte_id = ? AND status IS NOT NULL ORDER BY iniciada_em DESC LIMIT ?',
      fonteId,
      limite,
    )
  }

  ultimaDaFonte(fonteId: string): ColetaExecucao | undefined {
    return this.ultimasDaFonte(fonteId, 1)[0]
  }
}
