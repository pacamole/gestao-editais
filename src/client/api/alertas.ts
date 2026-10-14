import type {
  AlertasResposta,
  ConfigAlertaResposta,
  LogsAlertaResposta,
  SalvarAlertaEntrada,
} from '../../shared/tipos/alertas'
import { requisicao } from './cliente'

export const alertas = {
  listar: () => requisicao<AlertasResposta>('/api/alertas'),

  salvar: (dados: SalvarAlertaEntrada) =>
    requisicao<ConfigAlertaResposta>('/api/alertas', { metodo: 'POST', corpo: dados }),

  logs: () => requisicao<LogsAlertaResposta>('/api/alertas/logs'),
}
