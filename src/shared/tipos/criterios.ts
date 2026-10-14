// Contratos da API de critérios (/api/criterios).

import type { Criterio, StatusElegibilidade } from './dominio.js'

export type { Criterio, Operador, StatusElegibilidade, TipoCriterio } from './dominio.js'

export type ListaCriteriosResposta = {
  eliminatorios: Criterio[]
  pontuaveis: Criterio[]
}

// Sem id = novo critério.
export type SalvarCriterioEntrada = Omit<Criterio, 'id'> & { id?: string }

export type CriterioResposta = { ok: true; criterio: Criterio }
export type ExcluirCriterioResposta = { ok: true; removido: boolean }
export type OkCriterioResposta = { ok: true }

export type FalhaSimulacao = { criterio_id: string; nome: string; mensagem: string }

export type ResultadoSimulacao = {
  status: StatusElegibilidade
  nota_fit: number
  falhas: FalhaSimulacao[]
  resumo: string
}

export type SimulacaoResposta = { ok: true; simulacao: ResultadoSimulacao }
