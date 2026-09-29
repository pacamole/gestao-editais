import type { Papel, Usuario } from '../entidades.js'
import { Repositorio } from './repositorio.js'

export class UsuarioRepositorio extends Repositorio<Usuario, string, 'id' | 'criado_em' | 'ativo'> {
  protected readonly tabela = 'usuario'
  protected readonly colunasBooleanas = ['ativo'] as const
  protected readonly colunaCriacao = 'criado_em'
  protected readonly ordemPadrao = 'nome'

  // E-mail é único e comparado sem diferenciar maiúsculas (COLLATE NOCASE).
  buscarPorEmail(email: string): Usuario | undefined {
    return this.consultarUm('SELECT * FROM usuario WHERE email = ?', email)
  }

  listarAtivosPorPapel(papeis: readonly Papel[]): Usuario[] {
    return this.consultar(
      `SELECT * FROM usuario WHERE ativo = 1 AND papel IN (${Repositorio.marcadores(papeis)}) ORDER BY nome`,
      ...papeis,
    )
  }
}
