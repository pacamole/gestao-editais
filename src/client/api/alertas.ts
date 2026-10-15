import type {
  AlertasResposta,
  LogsAlertaResposta,
  SalvarAlertasEntrada,
  SalvarAlertasResposta,
} from '../../shared/tipos/alertas'
import { requisicao } from './cliente'

export const alertas = {
  listar: () => requisicao<AlertasResposta>('/api/alertas'),

  // Grava todos de uma vez: ou salva tudo, ou nada.
  salvar: (dados: SalvarAlertasEntrada) =>
    requisicao<SalvarAlertasResposta>('/api/alertas', { metodo: 'POST', corpo: dados }),

  logs: () => requisicao<LogsAlertaResposta>('/api/alertas/logs'),
}
