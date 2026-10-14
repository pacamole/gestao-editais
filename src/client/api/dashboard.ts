import type { DashboardResposta } from '../../shared/tipos/dashboard'
import { requisicao } from './cliente'

export const dashboard = {
  obter: () => requisicao<DashboardResposta>('/api/dashboard'),
}
