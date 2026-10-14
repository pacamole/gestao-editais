// Contratos da lista de editais (/api/editais), ações em lote e nova entrada (POST /api/editais).
// O detalhe de um edital fica em ./edital.ts.

import type { Classificacao, Modalidade, StatusEdital, StatusElegibilidade } from './dominio.js'

// ---- Lista (GET /api/editais) ----

// Filtros da tela. Os valores 'TODOS'/'TODAS' e textos vazios significam "sem filtro".
export type FiltrosEditais = {
  busca: string
  status: string // 'TODOS' ou código de STATUS_EDITAL (o servidor aceita vários separados por vírgula)
  elegibilidade: string // 'TODAS' | 'ELEGIVEL' | 'INDETERMINADO' | 'INELEGIVEL'
  faixaFit: string // 'TODAS' | 'ALTO' | 'MEDIO' | 'BAIXO'
  modalidade: string // 'TODAS' ou código de MODALIDADES
  fonteId: string // 'TODAS' ou id da fonte
  prazoDe: string // 'AAAA-MM-DD' ou ''
  prazoAte: string
  somentePrazoAberto: boolean
  novosSemana: boolean
  prazoUrgente: boolean
}

// Linha da lista. O servidor envia todas as colunas de `edital`; aqui só as usadas pela interface.
export type ItemListaEdital = {
  id: string
  titulo: string
  orgao_financiador: string | null
  numero_edital: string | null
  modalidade: Modalidade | null
  prazo_inscricao: string | null
  valor_maximo_por_projeto: number | null
  status: StatusEdital
  fonte_nome: string | null
  status_elegibilidade: StatusElegibilidade | null
  nota_fit: number | null
  nota_ajustada_manual: number | null
  classificacao: Classificacao | null
  dias_restantes: number | null
  prazo_urgente: boolean
}

export type ListaEditaisResposta = {
  itens: ItemListaEdital[]
  total: number
  pagina: number
  limite: number
  totalPaginas: number
}

// ---- Ações em lote (POST /api/editais/lote) ----

export type AcaoLote = 'APROVAR' | 'DESCARTAR'

export type LoteEntrada = {
  ids: string[]
  acao: AcaoLote
  comentario?: string // obrigatório para DESCARTAR
}

export type LoteResposta = {
  ok: true
  total: number
  status: 'APROVADO' | 'DESCARTADO'
}

// ---- Nova entrada (POST /api/editais) ----

export type CriarPorUploadEntrada = {
  tipo: 'UPLOAD_PDF'
  nome_arquivo: string
  arquivo_base64: string
  fonte_id: string
}

export type CriarPorUrlEntrada = {
  tipo: 'URL'
  url: string
  fonte_id: string
}

// Campos de lista aceitam texto separado por vírgula (o servidor divide) ou a lista pronta.
type ListaTexto = string | string[] | null

export type CriarManualEntrada = {
  tipo: 'MANUAL'
  titulo: string
  orgao_financiador: string | null
  numero_edital: string | null
  modalidade: string | null // código de MODALIDADES vindo do formulário
  fonte_id: string
  data_publicacao: string | null
  prazo_inscricao: string | null
  data_resultado_prevista: string | null
  valor_total_disponivel: number | null
  valor_maximo_por_projeto: number | null
  exige_contrapartida: boolean
  percentual_contrapartida: number | null
  publico_alvo: ListaTexto
  cnaes_aceitos: ListaTexto
  portes_aceitos: ListaTexto
  natureza_juridica_aceita: ListaTexto
  abrangencia_geografica: ListaTexto
  exige_ict_parceira: boolean
  tempo_minimo_fundacao_meses: number | null
  faturamento_minimo: number | null
  faturamento_maximo: number | null
  certidoes_exigidas: ListaTexto
  areas_tematicas: ListaTexto
  permite_submissao_multipla: boolean
  resumo_executivo: string | null
}

export type CriarEditalEntrada = CriarPorUploadEntrada | CriarPorUrlEntrada | CriarManualEntrada

// `duplicado` indica que o edital já existia e `id` aponta para ele.
export type CriarEditalResposta = {
  ok: true
  id: string
  duplicado?: true
  mensagem?: string
}
