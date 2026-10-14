// Contratos da API do dashboard (/api/dashboard).

import type { Classificacao, Modalidade, StatusColeta, StatusEdital, StatusElegibilidade, TipoFonte } from './dominio.js'

export type CartoesDashboard = {
  novosSemana: number
  aguardandoRevisao: number
  aprovadosSemInscricao: number
  prazoUrgente: number
}

// Subconjunto das colunas do edital (e.*) com a última avaliação e o nome da fonte.
export type EditalResumoDashboard = {
  id: string
  titulo: string
  orgao_financiador: string | null
  numero_edital: string | null
  modalidade: Modalidade | null
  status: StatusEdital
  prazo_inscricao: string | null
  fonte_id: string
  fonte_nome: string | null
  status_elegibilidade: StatusElegibilidade | null
  nota_fit: number | null
  classificacao: Classificacao | null
  nota_ajustada_manual: number | null
}

export type EditalUrgente = EditalResumoDashboard & {
  dias_restantes: number
  urgente: boolean
}

export type EditalTopFit = EditalResumoDashboard

export type DistribuicaoFit = {
  alto: number
  medio: number
  baixo: number
  total: number
}

// PENDENTE/INATIVO: fonte sem execução registrada.
export type StatusSaudeColeta = StatusColeta | 'PENDENTE' | 'INATIVO'

export type SaudeFonte = {
  fonte_id: string
  nome: string
  tipo: TipoFonte
  ativo: boolean
  ultima_coleta_em: string | null
  status: StatusSaudeColeta
  mensagem_erro: string | null
  itens_coletados: number
}

export type DashboardResposta = {
  cartoes: CartoesDashboard
  editaisUrgentes: EditalUrgente[]
  topFit: EditalTopFit[]
  distribuicao: DistribuicaoFit
  saudeColeta: SaudeFonte[]
}
