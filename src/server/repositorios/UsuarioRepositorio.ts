import type { Usuario } from '../dominio/entidades.js'
import { agora, novoId } from '../db/index.js'
import { Repositorio } from './repositorio.js'

export class UsuarioRepositorio extends Repositorio<Usuario, string, 'id' | 'criado_em' | 'ativo'> {
  protected readonly tabela = 'usuario'
  protected readonly colunasBooleanas = ['ativo'] as const
  protected readonly colunaCriacao = 'criado_em'
  protected readonly ordemPadrao = 'nome'

  /** Cria a conta. A coluna legada `papel` é NOT NULL no banco e não faz parte da entidade: gravada com valor fixo. */
  criar(dados: { nome: string; email: string; senha_hash: string }): Usuario {
    const id = novoId()
    this.executar(
      'INSERT INTO usuario (id, nome, email, senha_hash, papel, ativo, criado_em) VALUES (?, ?, ?, ?, ?, 1, ?)',
      id,
      dados.nome,
      dados.email,
      dados.senha_hash,
      'GESTOR',
      agora(),
    )
    return this.buscarPorId(id)!
  }

  // E-mail é único e comparado sem diferenciar maiúsculas (COLLATE NOCASE).
  buscarPorEmail(email: string): Usuario | undefined {
    return this.consultarUm('SELECT * FROM usuario WHERE email = ?', email)
  }

  /** O usuário ativo mais antigo; usado quando a requisição não traz sessão. */
  primeiroAtivo(): Usuario | undefined {
    return this.consultarUm('SELECT * FROM usuario WHERE ativo = 1 ORDER BY criado_em LIMIT 1')
  }

  listarAtivos(): Usuario[] {
    return this.consultar('SELECT * FROM usuario WHERE ativo = 1 ORDER BY nome')
  }
}
