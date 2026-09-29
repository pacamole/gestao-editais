import type { Conversa } from '../entidades.js'
import { Repositorio } from './repositorio.js'

// CH05: uma conversa por edital e usuário.
export class ConversaRepositorio extends Repositorio<Conversa, string, 'id' | 'criada_em' | 'atualizada_em'> {
  protected readonly tabela = 'conversa'
  protected readonly colunaCriacao = 'criada_em'
  protected readonly colunaAtualizacao = 'atualizada_em'

  buscarDoUsuario(editalId: string, usuarioId: string): Conversa | undefined {
    return this.consultarUm('SELECT * FROM conversa WHERE edital_id = ? AND usuario_id = ?', editalId, usuarioId)
  }
}
