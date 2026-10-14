import type { FonteResposta, ListaFontesResposta, SalvarFonteEntrada } from '../../shared/tipos/fontes'
import { requisicao } from './cliente'

export const fontes = {
  listar: () => requisicao<ListaFontesResposta>('/api/fontes'),

  salvar: (dados: SalvarFonteEntrada) =>
    requisicao<FonteResposta>('/api/fontes', { metodo: 'POST', corpo: dados }),

  alternarAtivo: (id: string) =>
    requisicao<FonteResposta>(`/api/fontes/${encodeURIComponent(id)}/ativo`, { metodo: 'PATCH' }),

  coletar: (id: string) =>
    requisicao<FonteResposta>(`/api/fontes/${encodeURIComponent(id)}/coletar`, { metodo: 'POST' }),
}
