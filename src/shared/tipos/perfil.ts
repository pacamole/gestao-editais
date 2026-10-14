// Contratos da API do perfil da empresa (/api/perfil-empresa).

import type { PerfilEmpresa, Porte } from './dominio.js'

export type { PerfilEmpresa, Porte } from './dominio.js'

export type PerfilResposta = { perfil: PerfilEmpresa | null }

// Números podem ir como texto do formulário: o servidor converte ('' = null).
type NumeroEntrada = number | string | null

export type SalvarPerfilEntrada = {
  razao_social: string
  nome_fantasia: string | null
  cnpj: string
  cnae_principal: string
  cnaes_secundarios: string[]
  porte: Porte
  natureza_juridica: string
  data_fundacao: string
  faturamento_anual: NumeroEntrada
  uf: string
  municipio: string
  areas_atuacao: string[]
  palavras_chave: string[]
  possui_ict_parceira: boolean
  certidoes_disponiveis: string[]
  capacidade_contrapartida_percentual: NumeroEntrada
  valor_minimo_interesse: NumeroEntrada
  prazo_minimo_preparo_dias: NumeroEntrada
  // Reavalia todos os editais ativos com o perfil salvo.
  reavaliar: boolean
}

export type SalvarPerfilResposta = {
  ok: true
  perfil: PerfilEmpresa
  reavaliacaoSolicitada: boolean
  editaisReavaliados: number
  chatsLimpos: boolean
}
