// Entidades do sistema, como os repositórios as entregam: colunas JSON já convertidas
// em arrays/objetos e colunas 0/1 em boolean. Nomes de campos iguais às colunas (db/schema.sql).

// ---- Acesso ----

export type Papel = 'ANALISTA' | 'GESTOR'

export type Usuario = {
  id: string
  nome: string
  email: string
  senha_hash: string
  papel: Papel
  ativo: boolean
  criado_em: string
}

export type Sessao = {
  id: string
  usuario_id: string
  criada_em: string
  expira_em: string
}

// ---- Editais ----

export type StatusEdital =
  | 'COLETADO'
  | 'EM_ANALISE'
  | 'ANALISADO'
  | 'FALHA'
  | 'EM_REVISAO'
  | 'APROVADO'
  | 'DESCARTADO'
  | 'INSCRITO'
  | 'ENCERRADO'
  | 'EXPIRADO'

export type Modalidade = 'SUBVENCAO' | 'CREDITO' | 'PREMIO' | 'LICITACAO' | 'CHAMADA_PUBLICA' | 'OUTRO'

// Listas: null = não localizado no documento; [] = o edital não restringe.
export type Edital = {
  id: string
  titulo: string
  orgao_financiador: string | null
  numero_edital: string | null
  modalidade: Modalidade | null
  fonte_id: string
  url_original: string | null
  url_documento: string | null
  texto_extraido: string | null
  hash_documento: string | null
  data_publicacao: string | null
  prazo_inscricao: string | null
  data_resultado_prevista: string | null
  valor_total_disponivel: number | null
  valor_maximo_por_projeto: number | null
  exige_contrapartida: boolean | null
  percentual_contrapartida: number | null
  publico_alvo: string[] | null
  cnaes_aceitos: string[] | null
  portes_aceitos: string[] | null
  natureza_juridica_aceita: string[] | null
  abrangencia_geografica: string[] | null
  exige_ict_parceira: boolean | null
  tempo_minimo_fundacao_meses: number | null
  faturamento_minimo: number | null
  faturamento_maximo: number | null
  certidoes_exigidas: string[] | null
  areas_tematicas: string[] | null
  permite_submissao_multipla: boolean | null
  resumo_executivo: string | null
  status: StatusEdital
  retificado: boolean
  erro_processamento: string | null
  criado_em: string
  atualizado_em: string
}

export type EditalVersao = {
  id: string
  edital_id: string
  hash_documento: string | null
  dados: Edital // snapshot do edital antes da retificação
  criado_em: string
}

export type Confianca = 'ALTA' | 'MEDIA' | 'BAIXA'

export type Evidencia = {
  id: string
  edital_id: string
  campo: string
  trecho_literal: string
  pagina: number | null
  confianca: Confianca | null
}

// ---- Perfil e critérios ----

export type Porte = 'MEI' | 'ME' | 'EPP' | 'MEDIA' | 'GRANDE'

export type PerfilEmpresa = {
  id: number // sempre 1
  razao_social: string
  nome_fantasia: string | null
  cnpj: string
  cnae_principal: string
  cnaes_secundarios: string[] | null
  porte: Porte
  natureza_juridica: string
  data_fundacao: string
  faturamento_anual: number | null
  uf: string
  municipio: string
  areas_atuacao: string[]
  palavras_chave: string[]
  possui_ict_parceira: boolean
  certidoes_disponiveis: string[] | null
  capacidade_contrapartida_percentual: number | null
  valor_minimo_interesse: number | null
  prazo_minimo_preparo_dias: number | null
  atualizado_em: string
}

export type TipoCriterio = 'ELIMINATORIO' | 'PONTUAVEL'

export type Operador =
  | 'CONTEM'
  | 'NAO_CONTEM'
  | 'INTERSECCAO'
  | 'CONTIDO_EM'
  | 'IGUAL'
  | 'DIFERENTE'
  | 'MAIOR_QUE'
  | 'MENOR_QUE'
  | 'ENTRE'
  | 'VERDADEIRO'
  | 'FALSO'
  | 'LISTA_VAZIA_OU_CONTEM'

export type Criterio = {
  id: string
  nome: string
  tipo: TipoCriterio
  campo_edital: string
  campo_perfil: string | null
  operador: Operador
  valor_referencia: string | null
  peso: number | null
  mensagem_reprovacao: string | null
  ativo: boolean
  ordem: number
}

// ---- Avaliação e revisão ----

export type StatusElegibilidade = 'ELEGIVEL' | 'INELEGIVEL' | 'INDETERMINADO'
export type Classificacao = 'ALTO' | 'MEDIO' | 'BAIXO'

export type CriterioViolado = { criterio_id: string; nome: string; motivo: string; evidencia_id: string | null }
export type CriterioIndeterminado = { criterio_id: string; nome: string; campo_faltante: string }
export type ItemPontuacao = { criterio_id: string; peso: number; pontuacao: number; contribuicao: number }

export type Avaliacao = {
  id: string
  edital_id: string
  status_elegibilidade: StatusElegibilidade
  nota_fit: number | null
  classificacao: Classificacao | null
  criterios_violados: CriterioViolado[] | null
  criterios_indeterminados: CriterioIndeterminado[] | null
  detalhamento_pontuacao: ItemPontuacao[] | null
  nota_ajustada_manual: number | null
  ajustada_por: string | null
  perfil_atualizado_em: string | null
  calculado_em: string
}

export type AcaoRevisao =
  | 'APROVOU'
  | 'DESCARTOU'
  | 'CORRIGIU_CAMPO'
  | 'AJUSTOU_NOTA'
  | 'REPROCESSOU'
  | 'MARCOU_INSCRITO'
  | 'REGISTROU_RESULTADO'

export type Revisao = {
  id: string
  edital_id: string
  usuario_id: string
  acao: AcaoRevisao
  campo_alterado: string | null
  valor_anterior: string | null
  valor_novo: string | null
  comentario: string | null
  criado_em: string
}

// ---- Coleta ----

export type TipoFonte = 'SCRAPER' | 'RSS' | 'UPLOAD_MANUAL' | 'URL_MANUAL'
export type StatusColeta = 'SUCESSO' | 'FALHA' | 'PARCIAL'

export type Fonte = {
  id: string
  nome: string
  url_base: string | null
  tipo: TipoFonte
  frequencia_cron: string | null
  ativo: boolean
  ultima_coleta_em: string | null
  ultimo_status: StatusColeta | null
  ultima_mensagem_erro: string | null
}

export type ColetaExecucao = {
  id: string
  fonte_id: string
  iniciada_em: string
  finalizada_em: string | null
  status: StatusColeta | null // null = em andamento
  itens_coletados: number
  mensagem_erro: string | null
}

// ---- Chat ----

export type Conversa = {
  id: string
  edital_id: string
  usuario_id: string
  criada_em: string
  atualizada_em: string
}

export type PapelMensagem = 'USUARIO' | 'ASSISTENTE'

export type Mensagem = {
  id: string
  conversa_id: string
  papel: PapelMensagem
  conteudo: string
  tokens_estimados: number | null
  criada_em: string
}

// ---- Notificações e configuração ----

export type TipoNotificacao = 'E01' | 'E02' | 'E03' | 'E04' | 'E05' | 'E06'

export type NotificacaoLog = {
  id: string
  tipo: TipoNotificacao
  edital_id: string | null
  marco: string
  destinatarios: string[]
  assunto: string
  enviado_em: string
  status_envio: 'ENVIADO' | 'FALHOU'
}

export type ConfigAlerta = {
  tipo: TipoNotificacao
  ativo: boolean
  destinatarios: string[] // e-mails fixos; vazio = papéis padrão da notificação
  parametros: Record<string, unknown>
}

export type Config = {
  chave: string
  valor: string
}
