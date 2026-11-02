import type { PendenciasResposta } from '../../shared/tipos/pendencias'
import { requisicao } from './cliente'

export const pendencias = {
  obter: () => requisicao<PendenciasResposta>('/api/pendencias'),
}
