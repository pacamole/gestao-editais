import type {
  CriterioResposta,
  ExcluirCriterioResposta,
  ListaCriteriosResposta,
  OkCriterioResposta,
  SalvarCriterioEntrada,
  SimulacaoResposta,
} from '../../shared/tipos/criterios'
import { requisicao } from './cliente'

// Tipo mínimo de /api/editais usado só para escolher o edital da simulação.
export type EditalParaSimulacao = { id: string; titulo: string }

const caminhoCriterio = (id: string) => `/api/criterios/${encodeURIComponent(id)}`

export const criterios = {
  listar: () => requisicao<ListaCriteriosResposta>('/api/criterios'),

  salvar: (dados: SalvarCriterioEntrada) =>
    requisicao<CriterioResposta>('/api/criterios', { metodo: 'POST', corpo: dados }),

  excluir: (id: string) => requisicao<ExcluirCriterioResposta>(caminhoCriterio(id), { metodo: 'DELETE' }),

  alternarAtivo: (id: string) => requisicao<CriterioResposta>(`${caminhoCriterio(id)}/ativo`, { metodo: 'PATCH' }),

  reordenar: (ids: string[]) =>
    requisicao<OkCriterioResposta>('/api/criterios/reordenar', { metodo: 'POST', corpo: { ids } }),

  simular: (editalId: string) =>
    requisicao<SimulacaoResposta>('/api/criterios/simular', { metodo: 'POST', corpo: { edital_id: editalId } }),

  // Os 20 primeiros editais da listagem padrão.
  async editaisParaSimulacao(): Promise<EditalParaSimulacao[]> {
    const lista = await requisicao<{ itens?: EditalParaSimulacao[] }>('/api/editais', { query: { limite: 20 } })
    return lista.itens ?? []
  },
}
