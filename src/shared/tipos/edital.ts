// Contratos da API de detalhe do edital (/api/editais/:id e ações sobre ele).

import type { CampoEditavel } from '../camposEditaveis.js'
import type { AcaoTransicao } from '../statusEdital.js'
import type { Avaliacao, Edital, Evidencia, Revisao } from './dominio.js'
import type { AnaliseElegibilidade } from './triagem.js'

export type {
  AcaoRevisao,
  Avaliacao,
  Classificacao,
  Confianca,
  CriterioIndeterminado,
  CriterioViolado,
  Evidencia,
  ItemPontuacao,
  Modalidade,
  Revisao,
  StatusEdital,
  StatusElegibilidade,
} from './dominio.js'
export type { AnaliseElegibilidade, RequisitoTriagem, StatusRequisitoTriagem } from './triagem.js'
export type { CampoEditavel } from '../camposEditaveis.js'

// O detalhe devolve o edital completo.
export type EditalDetalhado = Edital

// Ações aceitas por POST /editais/:id/revisao.
export type AcaoRevisaoManual = AcaoTransicao

export type RevisarEntrada = { acao: AcaoRevisaoManual; comentario: string }

export type RevisarResposta = { revisao: Revisao; edital: EditalDetalhado }

// ---- Detalhe ----

export type DetalheEditalResposta = {
  edital: EditalDetalhado
  avaliacao: Avaliacao | null
  evidencias: Evidencia[]
  revisoes: Revisao[]
  analise_elegibilidade: AnaliseElegibilidade | null
}

export type TriagemElegibilidadeResposta = {
  analise: AnaliseElegibilidade
  avaliacao: Avaliacao
}

// ---- Edição manual e extração de campos ----

export type ValorCampoEditavel = string | number | boolean | string[] | null

export type SalvarCamposEntrada = { campos: Partial<Record<CampoEditavel, ValorCampoEditavel>> }

export type SalvarCamposResposta = {
  edital: EditalDetalhado
  campos: CampoEditavel[]
  mensagem: string
}

// Resposta de POST /editais/:id/extrair-dados e /ler-url.
export type ExtracaoResposta = {
  edital: EditalDetalhado
  atualizados: number
  campos: CampoEditavel[]
  mensagem: string
}

// Corpo de erro de /ler-url: textoSalvo indica que a página foi lida e só a extração falhou.
export type ErroLerUrlDados = { erro: string; textoSalvo?: boolean }
