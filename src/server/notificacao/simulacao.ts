import type { Avaliacao, CriterioIndeterminado, Edital, Fonte, TipoNotificacao } from '../dominio/entidades.js'
import type { Notificacao } from './notificacao.js'
import { NovoEditalFitAlto } from './tipos/E01NovoEditalFitAlto.js'
import { PrazoProximo } from './tipos/E02PrazoProximo.js'
import { VerificacaoNecessaria } from './tipos/E03VerificacaoNecessaria.js'
import { ResumoSemanal, type ResumoSemanalDados } from './tipos/E04ResumoSemanal.js'
import { EditalRetificado, type Mudanca } from './tipos/E05EditalRetificado.js'
import { FalhaColeta } from './tipos/E06FalhaColeta.js'

// Dados FICTÍCIOS para o botão "Simular envio" da tela de alertas.
// Nada aqui vem do banco nem corresponde a editais, órgãos ou fontes reais.

const DIA_MS = 86_400_000
const DIAS_PARA_O_PRAZO = 7
const diasAPartirDeHoje = (dias: number) => new Date(Date.now() + dias * DIA_MS).toISOString()

export const EDITAL_FICTICIO: Edital = {
  id: 'edital-ficticio',
  titulo: '[FICTÍCIO] Chamada de Teste de Inovação 00/0000',
  orgao_financiador: 'Agência Fictícia de Fomento',
  numero_edital: '00/0000',
  modalidade: 'SUBVENCAO',
  fonte_id: 'fonte-ficticia',
  url_original: 'https://exemplo.invalid/edital-ficticio',
  url_documento: 'https://exemplo.invalid/edital-ficticio.pdf',
  texto_extraido: null,
  hash_documento: null,
  data_publicacao: diasAPartirDeHoje(-10),
  prazo_inscricao: diasAPartirDeHoje(DIAS_PARA_O_PRAZO),
  data_resultado_prevista: diasAPartirDeHoje(60),
  valor_total_disponivel: 1_234_567,
  valor_maximo_por_projeto: 123_456,
  exige_contrapartida: true,
  percentual_contrapartida: 10,
  publico_alvo: ['Empresas fictícias de teste'],
  cnaes_aceitos: [],
  portes_aceitos: ['ME', 'EPP'],
  natureza_juridica_aceita: [],
  abrangencia_geografica: ['PR'],
  exige_ict_parceira: false,
  tempo_minimo_fundacao_meses: null,
  faturamento_minimo: null,
  faturamento_maximo: null,
  certidoes_exigidas: ['CND'],
  areas_tematicas: ['Inovação', 'Sustentabilidade'],
  permite_submissao_multipla: false,
  resumo_executivo: 'Edital inventado para testar o envio de alertas. Não se inscreva: ele não existe.',
  status: 'ANALISADO',
  retificado: false,
  erro_processamento: null,
  criado_em: diasAPartirDeHoje(-1),
  atualizado_em: diasAPartirDeHoje(-1),
}

export const NOTA_FICTICIA = 87

export const AVALIACAO_FICTICIA: Avaliacao = {
  id: 'avaliacao-ficticia',
  edital_id: EDITAL_FICTICIO.id,
  status_elegibilidade: 'ELEGIVEL',
  nota_fit: NOTA_FICTICIA,
  classificacao: 'ALTO',
  criterios_violados: [],
  criterios_indeterminados: [],
  detalhamento_pontuacao: [],
  nota_ajustada_manual: null,
  ajustada_por: null,
  perfil_atualizado_em: null,
  calculado_em: diasAPartirDeHoje(0),
}

export const DESTAQUES_FICTICIOS = [
  { nome: 'Aderência temática (fictício)', contribuicao: 32 },
  { nome: 'Valor da oportunidade (fictício)', contribuicao: 25 },
  { nome: 'Folga de prazo (fictício)', contribuicao: 14 },
]

export const INDETERMINADOS_FICTICIOS: CriterioIndeterminado[] = [
  { criterio_id: 'criterio-ficticio-1', nome: 'Tempo de fundação (fictício)', campo_faltante: 'tempo_minimo_fundacao_meses' },
  { criterio_id: 'criterio-ficticio-2', nome: 'Faturamento dentro da faixa (fictício)', campo_faltante: 'faturamento_minimo' },
]

export const MUDANCAS_FICTICIAS: Mudanca[] = [
  { campo: 'Prazo de inscrição', antes: '01/01/2000', agora: '15/01/2000' },
  { campo: 'Valor por projeto', antes: 'R$ 100.000,00', agora: 'R$ 123.456,00' },
]

export const FONTE_FICTICIA: Fonte = {
  id: 'fonte-ficticia',
  nome: '[FICTÍCIO] Portal de Teste',
  url_base: 'https://exemplo.invalid/portal',
  tipo: 'SCRAPER',
  frequencia_cron: '0 6 * * *',
  ativo: true,
  ultima_coleta_em: diasAPartirDeHoje(0),
  ultimo_status: 'FALHA',
  ultima_mensagem_erro: 'Erro fictício: o portal de teste não respondeu (HTTP 503).',
}

export const FALHAS_SEGUIDAS_FICTICIAS = 3

export function resumoSemanalFicticio(): ResumoSemanalDados {
  return {
    inicio: new Date(Date.now() - 7 * DIA_MS),
    fim: new Date(),
    numeros: { coletados: 12, elegiveis: 5, inelegiveis: 4, indeterminados: 3, aprovados: 2, inscritos: 1 },
    maioresOportunidades: [
      { nota: NOTA_FICTICIA, titulo: EDITAL_FICTICIO.titulo, orgao: EDITAL_FICTICIO.orgao_financiador, prazo: EDITAL_FICTICIO.prazo_inscricao },
      { nota: 74, titulo: '[FICTÍCIO] Programa Imaginário de Apoio 99/9999', orgao: 'Fundação de Mentira', prazo: diasAPartirDeHoje(20) },
    ],
    prazosProximos: [{ dias: DIAS_PARA_O_PRAZO, titulo: EDITAL_FICTICIO.titulo, status: 'APROVADO' }],
    pendencias: { aguardandoVerificacao: 3, aprovadosSemInscricao: 1 },
    fontes: [{ nome: FONTE_FICTICIA.nome, ultimoStatus: 'SUCESSO', ultimaColetaEm: diasAPartirDeHoje(0), itens: 4 }],
  }
}

// Monta a mesma notificação do alerta real, só que com os dados acima.
export function notificacaoSimulada(tipo: TipoNotificacao): Notificacao {
  switch (tipo) {
    case 'E01':
      return new NovoEditalFitAlto(EDITAL_FICTICIO, AVALIACAO_FICTICIA, NOTA_FICTICIA, DESTAQUES_FICTICIOS)
    case 'E02':
      return new PrazoProximo(EDITAL_FICTICIO, DIAS_PARA_O_PRAZO, NOTA_FICTICIA, INDETERMINADOS_FICTICIOS)
    case 'E03':
      return new VerificacaoNecessaria(EDITAL_FICTICIO, INDETERMINADOS_FICTICIOS)
    case 'E04':
      return new ResumoSemanal(resumoSemanalFicticio())
    case 'E05':
      return new EditalRetificado(
        { ...EDITAL_FICTICIO, retificado: true },
        MUDANCAS_FICTICIAS,
        { antes: 'ELEGIVEL', agora: 'INDETERMINADO' },
        { antes: 72, agora: NOTA_FICTICIA },
        'simulacao',
      )
    case 'E06':
      return new FalhaColeta(FONTE_FICTICIA, FALHAS_SEGUIDAS_FICTICIAS, 'falha-ficticia')
  }
}
