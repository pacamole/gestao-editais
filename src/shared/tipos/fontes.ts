// Contratos da API de fontes (/api/fontes).

import type { ColetaExecucao, Fonte, TipoFonte } from './dominio.js'

export type { StatusColeta, TipoFonte } from './dominio.js'

export type ExecucaoColeta = ColetaExecucao
export type FonteResumo = Fonte

export type FonteComExecucoes = FonteResumo & { execucoes: ExecucaoColeta[] }

export type ListaFontesResposta = { fontes: FonteComExecucoes[] }

export type SalvarFonteEntrada = {
  id?: string
  nome: string
  url_base: string | null
  tipo: TipoFonte
  frequencia_cron: string | null
  ativo: boolean
}

export type FonteResposta = { ok: true; fonte: FonteResumo }
