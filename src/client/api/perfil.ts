import type { PerfilResposta, SalvarPerfilEntrada, SalvarPerfilResposta } from '../../shared/tipos/perfil'
import { requisicao } from './cliente'

export const perfil = {
  obter: () => requisicao<PerfilResposta>('/api/perfil-empresa'),

  salvar: (dados: SalvarPerfilEntrada) =>
    requisicao<SalvarPerfilResposta>('/api/perfil-empresa', { metodo: 'POST', corpo: dados }),
}
