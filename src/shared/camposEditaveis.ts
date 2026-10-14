// Campos do edital que a edição manual e a extração por IA podem preencher.
export const CAMPOS_EDITAVEIS = [
  'orgao_financiador',
  'numero_edital',
  'modalidade',
  'data_publicacao',
  'prazo_inscricao',
  'data_resultado_prevista',
  'valor_total_disponivel',
  'valor_maximo_por_projeto',
  'exige_contrapartida',
  'percentual_contrapartida',
  'publico_alvo',
  'cnaes_aceitos',
  'portes_aceitos',
  'abrangencia_geografica',
  'areas_tematicas',
  'resumo_executivo',
] as const

export type CampoEditavel = typeof CAMPOS_EDITAVEIS[number]

// Trecho gravado como evidência quando o campo foi editado à mão.
export const MARCADOR_EDICAO_MANUAL = 'Editado manualmente; sem evidência extraída do documento.'
