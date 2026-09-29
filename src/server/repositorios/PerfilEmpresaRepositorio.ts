import type { PerfilEmpresa } from '../entidades.js'
import { Repositorio } from './repositorio.js'

// Registro único (id = 1).
export class PerfilEmpresaRepositorio extends Repositorio<PerfilEmpresa, number, 'atualizado_em'> {
  static readonly ID = 1

  protected readonly tabela = 'perfil_empresa'
  protected readonly gerarId = false
  protected readonly colunasJson = ['cnaes_secundarios', 'areas_atuacao', 'palavras_chave', 'certidoes_disponiveis'] as const
  protected readonly colunasBooleanas = ['possui_ict_parceira'] as const
  protected readonly colunaAtualizacao = 'atualizado_em'

  obter(): PerfilEmpresa | undefined {
    return this.buscarPorId(PerfilEmpresaRepositorio.ID)
  }

  salvar(alteracoes: Partial<PerfilEmpresa>): PerfilEmpresa | undefined {
    return this.atualizar(PerfilEmpresaRepositorio.ID, alteracoes)
  }
}
