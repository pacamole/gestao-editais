import type { ListaDestinatariosResposta, RemoverDestinatarioResposta } from '../../shared/tipos/destinatarios'
import { requisicao } from './cliente'

export const destinatarios = {
  listar: () => requisicao<ListaDestinatariosResposta>('/api/destinatarios'),

  adicionar: (email: string) =>
    requisicao<ListaDestinatariosResposta>('/api/destinatarios', { metodo: 'POST', corpo: { email } }),

  remover: (email: string) =>
    requisicao<RemoverDestinatarioResposta>(`/api/destinatarios/${encodeURIComponent(email)}`, { metodo: 'DELETE' }),
}
