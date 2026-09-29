// Rótulos de exibição e metadados de campos, usados pela interface e pelos e-mails.

export type TipoCampo = 'texto' | 'moeda' | 'percentual' | 'inteiro' | 'data' | 'dataHora' | 'booleano' | 'lista' | 'modalidade'

export type CampoEdital = {
  rotulo: string
  tipo: TipoCampo
  // Termo sugerido para busca manual no documento quando o campo não é localizado (E03).
  termoBusca: string
}

// Campos extraídos do edital (§6).
export const CAMPOS_EDITAL = {
  titulo: { rotulo: 'Título', tipo: 'texto', termoBusca: 'edital' },
  orgao_financiador: { rotulo: 'Órgão financiador', tipo: 'texto', termoBusca: 'órgão' },
  numero_edital: { rotulo: 'Número do edital', tipo: 'texto', termoBusca: 'chamada' },
  modalidade: { rotulo: 'Modalidade', tipo: 'modalidade', termoBusca: 'modalidade' },
  data_publicacao: { rotulo: 'Data de publicação', tipo: 'data', termoBusca: 'publicação' },
  prazo_inscricao: { rotulo: 'Prazo de inscrição', tipo: 'dataHora', termoBusca: 'prazo' },
  data_resultado_prevista: { rotulo: 'Resultado previsto', tipo: 'data', termoBusca: 'resultado' },
  valor_total_disponivel: { rotulo: 'Valor total disponível', tipo: 'moeda', termoBusca: 'valor global' },
  valor_maximo_por_projeto: { rotulo: 'Valor máximo por projeto', tipo: 'moeda', termoBusca: 'valor máximo' },
  exige_contrapartida: { rotulo: 'Exige contrapartida', tipo: 'booleano', termoBusca: 'contrapartida' },
  percentual_contrapartida: { rotulo: 'Percentual de contrapartida', tipo: 'percentual', termoBusca: 'contrapartida' },
  publico_alvo: { rotulo: 'Público-alvo', tipo: 'lista', termoBusca: 'público-alvo' },
  cnaes_aceitos: { rotulo: 'CNAEs aceitos', tipo: 'lista', termoBusca: 'CNAE' },
  portes_aceitos: { rotulo: 'Portes aceitos', tipo: 'lista', termoBusca: 'porte' },
  natureza_juridica_aceita: { rotulo: 'Natureza jurídica aceita', tipo: 'lista', termoBusca: 'natureza jurídica' },
  abrangencia_geografica: { rotulo: 'Abrangência geográfica', tipo: 'lista', termoBusca: 'sediada' },
  exige_ict_parceira: { rotulo: 'Exige ICT parceira', tipo: 'booleano', termoBusca: 'ICT' },
  tempo_minimo_fundacao_meses: { rotulo: 'Tempo mínimo de fundação (meses)', tipo: 'inteiro', termoBusca: 'constituída' },
  faturamento_minimo: { rotulo: 'Faturamento mínimo', tipo: 'moeda', termoBusca: 'receita bruta' },
  faturamento_maximo: { rotulo: 'Faturamento máximo', tipo: 'moeda', termoBusca: 'receita bruta' },
  certidoes_exigidas: { rotulo: 'Certidões exigidas', tipo: 'lista', termoBusca: 'certidão' },
  areas_tematicas: { rotulo: 'Áreas temáticas', tipo: 'lista', termoBusca: 'linhas temáticas' },
  permite_submissao_multipla: { rotulo: 'Permite submissão múltipla', tipo: 'booleano', termoBusca: 'mais de uma proposta' },
} satisfies Record<string, CampoEdital>

export type NomeCampoEdital = keyof typeof CAMPOS_EDITAL

export const MODALIDADES: Record<string, string> = {
  SUBVENCAO: 'Subvenção',
  CREDITO: 'Crédito',
  PREMIO: 'Prêmio',
  LICITACAO: 'Licitação',
  CHAMADA_PUBLICA: 'Chamada pública',
  OUTRO: 'Outro',
}

export const STATUS_EDITAL: Record<string, string> = {
  COLETADO: 'Coletado',
  EM_ANALISE: 'Em análise',
  ANALISADO: 'Analisado',
  FALHA: 'Falha',
  EM_REVISAO: 'Em revisão',
  APROVADO: 'Aprovado',
  DESCARTADO: 'Descartado',
  INSCRITO: 'Inscrito',
  ENCERRADO: 'Encerrado',
  EXPIRADO: 'Expirado',
}

export const ELEGIBILIDADE: Record<string, string> = {
  ELEGIVEL: 'Elegível',
  INELEGIVEL: 'Inelegível',
  INDETERMINADO: 'Indeterminado',
}

export const CLASSIFICACAO: Record<string, string> = {
  ALTO: 'Alto fit',
  MEDIO: 'Médio fit',
  BAIXO: 'Baixo fit',
}
