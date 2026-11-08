import type { StatusElegibilidade } from './tipos/dominio.js'

// Rótulos de exibição e metadados de campos, usados pela interface e pelos e-mails.

export type TipoCampo = 'texto' | 'moeda' | 'percentual' | 'inteiro' | 'data' | 'booleano' | 'lista' | 'modalidade'

export type CampoEdital = {
  rotulo: string
  tipo: TipoCampo
  // Termo sugerido para busca manual no documento quando o campo não é localizado (E03).
  termoBusca: string
  // O que procurar no documento; entra na instrução enviada à IA.
  dica: string
  // Campo longo, mostrado só no detalhe do edital (fora de e-mails e critérios).
  somenteDetalhe?: boolean
}

// Catálogo único dos campos do edital (§6): quem extrai, edita, valida, compara ou exibe um campo parte daqui.
// Campo novo = uma linha neste catálogo.
export const CAMPOS_EDITAL = {
  titulo: { rotulo: 'Título', tipo: 'texto', termoBusca: 'edital', dica: 'nome da chamada' },
  orgao_financiador: { rotulo: 'Órgão financiador', tipo: 'texto', termoBusca: 'órgão', dica: 'instituição que lança e financia a chamada' },
  numero_edital: { rotulo: 'Número do edital', tipo: 'texto', termoBusca: 'chamada', dica: 'número e ano da chamada, como 12/2026' },
  modalidade: { rotulo: 'Modalidade', tipo: 'modalidade', termoBusca: 'modalidade', dica: 'forma de apoio: subvenção, crédito, prêmio…' },
  data_publicacao: { rotulo: 'Data de publicação', tipo: 'data', termoBusca: 'publicação', dica: 'dia em que a chamada foi publicada' },
  prazo_inscricao: { rotulo: 'Prazo de inscrição', tipo: 'data', termoBusca: 'prazo', dica: 'último dia para enviar a proposta' },
  data_resultado_prevista: { rotulo: 'Resultado previsto', tipo: 'data', termoBusca: 'resultado', dica: 'dia previsto para divulgar o resultado' },
  valor_total_disponivel: { rotulo: 'Valor total disponível', tipo: 'moeda', termoBusca: 'valor global', dica: 'recurso total da chamada, em reais' },
  valor_maximo_por_projeto: { rotulo: 'Valor máximo por projeto', tipo: 'moeda', termoBusca: 'valor máximo', dica: 'teto de apoio por proposta, em reais' },
  exige_contrapartida: { rotulo: 'Exige contrapartida', tipo: 'booleano', termoBusca: 'contrapartida', dica: 'true se a empresa precisa aportar recursos próprios' },
  percentual_contrapartida: { rotulo: 'Percentual de contrapartida', tipo: 'percentual', termoBusca: 'contrapartida', dica: 'percentual mínimo de contrapartida, de 0 a 100' },
  publico_alvo: { rotulo: 'Público-alvo', tipo: 'lista', termoBusca: 'público-alvo', dica: 'quem pode propor: empresas, ICTs, startups…' },
  cnaes_aceitos: { rotulo: 'CNAEs aceitos', tipo: 'lista', termoBusca: 'CNAE', dica: 'códigos CNAE habilitados' },
  portes_aceitos: { rotulo: 'Portes aceitos', tipo: 'lista', termoBusca: 'porte', dica: 'portes de empresa aceitos: MEI, ME, EPP, MEDIA, GRANDE' },
  natureza_juridica_aceita: { rotulo: 'Natureza jurídica aceita', tipo: 'lista', termoBusca: 'natureza jurídica', dica: 'naturezas jurídicas aceitas, como Sociedade Empresária Limitada' },
  abrangencia_geografica: { rotulo: 'Abrangência geográfica', tipo: 'lista', termoBusca: 'sediada', dica: 'siglas dos estados ou regiões atendidos' },
  exige_ict_parceira: { rotulo: 'Exige ICT parceira', tipo: 'booleano', termoBusca: 'ICT', dica: 'true se exige parceria com instituição científica e tecnológica' },
  tempo_minimo_fundacao_meses: { rotulo: 'Tempo mínimo de fundação (meses)', tipo: 'inteiro', termoBusca: 'constituída', dica: 'tempo mínimo de existência da empresa, em meses' },
  faturamento_minimo: { rotulo: 'Faturamento mínimo', tipo: 'moeda', termoBusca: 'receita bruta', dica: 'receita bruta anual mínima exigida, em reais' },
  faturamento_maximo: { rotulo: 'Faturamento máximo', tipo: 'moeda', termoBusca: 'receita bruta', dica: 'receita bruta anual máxima aceita, em reais' },
  certidoes_exigidas: { rotulo: 'Certidões exigidas', tipo: 'lista', termoBusca: 'certidão', dica: 'certidões e documentos de regularidade exigidos' },
  areas_tematicas: { rotulo: 'Áreas temáticas', tipo: 'lista', termoBusca: 'linhas temáticas', dica: 'temas e linhas de apoio da chamada' },
  permite_submissao_multipla: { rotulo: 'Permite submissão múltipla', tipo: 'booleano', termoBusca: 'mais de uma proposta', dica: 'true se o proponente pode enviar mais de uma proposta' },
  resumo_executivo: { rotulo: 'Resumo executivo', tipo: 'texto', termoBusca: 'objetivo', dica: 'objetivo e apoio descritos na chamada', somenteDetalhe: true },
} satisfies Record<string, CampoEdital>

export type NomeCampoEdital = keyof typeof CAMPOS_EDITAL

/** Campos mostrados em e-mails e comparações (todos, menos os de leitura longa). */
export const CAMPOS_EDITAL_RESUMIVEIS = (Object.keys(CAMPOS_EDITAL) as NomeCampoEdital[]).filter(
  (campo) => !(CAMPOS_EDITAL[campo] as CampoEdital).somenteDetalhe,
)

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
  FORA_DO_PERFIL: 'Fora do perfil',
}

// Origem do edital como o usuário a vê: as fontes internas ganham nomes de ação; fonte excluída fica indicada.
const ORIGENS_INTERNAS: Record<string, string> = {
  'Upload manual': 'PDF enviado',
  'URL manual': 'Link colado',
  'Cadastro manual': 'Cadastro manual',
}

export function rotuloDaFonte(fonte: { nome: string; removida_em?: string | null }): string {
  const nome = ORIGENS_INTERNAS[fonte.nome] ?? fonte.nome
  return fonte.removida_em ? `${nome} (fonte excluída)` : nome
}

export const ELEGIBILIDADE: Record<string, string> = {
  ELEGIVEL: 'Elegível',
  INELEGIVEL: 'Inelegível',
  INDETERMINADO: 'Indeterminado',
}

export function resumoDaElegibilidade(status: StatusElegibilidade): string {
  switch (status) {
    case 'ELEGIVEL':
      return 'Todos os requisitos obrigatórios identificados foram atendidos.'
    case 'INELEGIVEL':
      return 'Pelo menos um requisito obrigatório não foi atendido.'
    case 'INDETERMINADO':
      return 'Não há informações suficientes para confirmar todos os requisitos de elegibilidade.'
  }
}

export const CLASSIFICACAO: Record<string, string> = {
  ALTO: 'Alto fit',
  MEDIO: 'Médio fit',
  BAIXO: 'Baixo fit',
}
