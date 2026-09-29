import type { Sessao } from '../entidades.js'
import { Repositorio } from './repositorio.js'

export class SessaoRepositorio extends Repositorio<Sessao, string, 'id' | 'criada_em'> {
  protected readonly tabela = 'sessao'
  protected readonly colunaCriacao = 'criada_em'

  buscarValida(id: string, agora: string): Sessao | undefined {
    return this.consultarUm('SELECT * FROM sessao WHERE id = ? AND expira_em > ?', id, agora)
  }

  excluirExpiradas(agora: string): number {
    return this.executar('DELETE FROM sessao WHERE expira_em <= ?', agora)
  }

  excluirDoUsuario(usuarioId: string): number {
    return this.executar('DELETE FROM sessao WHERE usuario_id = ?', usuarioId)
  }
}
