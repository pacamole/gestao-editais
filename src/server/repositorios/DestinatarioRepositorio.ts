import { agora } from '../db/index.js'
import type { Destinatario } from '../dominio/entidades.js'
import { Repositorio } from './repositorio.js'

// Lista de e-mails que podem receber alertas (e-mail é a chave, sem diferenciar maiúsculas).
export class DestinatarioRepositorio extends Repositorio<Destinatario, string, 'criado_em'> {
  protected readonly tabela = 'destinatario'
  protected readonly chave = 'email'
  protected readonly gerarId = false
  protected readonly colunaCriacao = 'criado_em'
  protected readonly ordemPadrao = 'email'

  emails(): string[] {
    return this.listar().map((d) => d.email)
  }

  /** Adiciona se ainda não estiver na lista; devolve false se já estava. */
  adicionar(email: string): boolean {
    return this.executar('INSERT INTO destinatario (email, criado_em) VALUES (?, ?) ON CONFLICT DO NOTHING', email, agora()) > 0
  }
}
