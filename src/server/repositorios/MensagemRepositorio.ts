import type { Mensagem } from '../entidades.js'
import { Repositorio } from './repositorio.js'

export class MensagemRepositorio extends Repositorio<Mensagem, string, 'id' | 'criada_em'> {
  protected readonly tabela = 'mensagem'
  protected readonly colunaCriacao = 'criada_em'

  listarDaConversa(conversaId: string): Mensagem[] {
    return this.consultar('SELECT * FROM mensagem WHERE conversa_id = ? ORDER BY criada_em', conversaId)
  }

  /** CH06: as últimas N mensagens, em ordem cronológica. */
  ultimasDaConversa(conversaId: string, limite: number): Mensagem[] {
    return this.consultar(
      `SELECT * FROM (SELECT * FROM mensagem WHERE conversa_id = ? ORDER BY criada_em DESC LIMIT ?)
       ORDER BY criada_em`,
      conversaId,
      limite,
    )
  }

  /** CH07: perguntas feitas pelo usuário, em qualquer edital, desde o instante informado. */
  contarPerguntasDoUsuarioDesde(usuarioId: string, instante: string): number {
    return this.contarOnde(
      `papel = 'USUARIO' AND criada_em >= ?
       AND conversa_id IN (SELECT id FROM conversa WHERE usuario_id = ?)`,
      instante,
      usuarioId,
    )
  }

  /** Botão "Limpar conversa" (P04, bloco 5). */
  excluirDaConversa(conversaId: string): number {
    return this.executar('DELETE FROM mensagem WHERE conversa_id = ?', conversaId)
  }
}
