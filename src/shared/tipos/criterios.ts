// Contratos da API de critérios (/api/criterios).

import type {
  Classificacao,
  Criterio,
  CriterioIndeterminado,
  CriterioViolado,
  ItemPontuacao,
  StatusElegibilidade,
} from './dominio.js'

export type { Criterio, Operador, StatusElegibilidade, TipoCriterio } from './dominio.js'

export type ListaCriteriosResposta = {
  eliminatorios: Criterio[]
  pontuaveis: Criterio[]
}

// Sem id = novo critério (entra no fim da lista do seu tipo).
export type SalvarCriterioEntrada = Omit<Criterio, 'id' | 'ordem'> & { id?: string }

// editaisReavaliados: editais em andamento que foram reavaliados com a mudança.
export type CriterioResposta = { ok: true; criterio: Criterio; editaisReavaliados: number }
export type ExcluirCriterioResposta = { ok: true; removido: boolean; editaisReavaliados: number }

// Resultado da avaliação de um edital com os critérios ativos (mesmo formato gravado em avaliacao).
export type ResultadoSimulacao = {
  status_elegibilidade: StatusElegibilidade
  nota_fit: number | null // só quando ELEGIVEL
  classificacao: Classificacao | null
  criterios_violados: CriterioViolado[]
  criterios_indeterminados: CriterioIndeterminado[]
  detalhamento_pontuacao: (ItemPontuacao & { nome: string })[]
}

export type SimulacaoResposta = { ok: true; simulacao: ResultadoSimulacao }
