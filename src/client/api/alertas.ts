import type {
  AlertasResposta,
  LogsAlertaResposta,
  SalvarAlertasEntrada,
  SalvarAlertasResposta,
  SimularAlertaResposta,
  TipoNotificacao,
} from '../../shared/tipos/alertas'
import { requisicao } from './cliente'

export const alertas = {
  listar: () => requisicao<AlertasResposta>('/api/alertas'),

  // Grava todos de uma vez: ou salva tudo, ou nada.
  salvar: (dados: SalvarAlertasEntrada) =>
    requisicao<SalvarAlertasResposta>('/api/alertas', { metodo: 'POST', corpo: dados }),

  logs: () => requisicao<LogsAlertaResposta>('/api/alertas/logs'),

  // Envia agora um e-mail de teste com dados fictícios; destinatários vazios = toda a lista.
  simular: (tipo: TipoNotificacao, destinatarios: string[]) =>
    requisicao<SimularAlertaResposta>(`/api/alertas/${tipo}/simular`, { metodo: 'POST', corpo: { destinatarios } }),
}
