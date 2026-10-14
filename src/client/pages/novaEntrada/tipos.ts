import type { CriarEditalResposta } from '../../../shared/tipos/editais'
import type { FonteComExecucoes } from '../../../shared/tipos/fontes'

// Os valores de cada formulário ficam na página para sobreviver à troca de aba.

export type ValoresUpload = { arquivo: File | null; fonteId: string }

export type ValoresUrl = { url: string; fonteId: string }

// Campos do cadastro manual como digitados (números ainda em texto).
export type ValoresManual = {
  fonteId: string
  titulo: string
  orgaoFinanciador: string
  numeroEdital: string
  modalidade: string
  dataPublicacao: string
  prazoInscricao: string
  dataResultado: string
  valorTotal: string
  valorMaximo: string
  exigeContrapartida: boolean
  percentualContrapartida: string
  publicoAlvo: string
  cnaesAceitos: string
  portesAceitos: string[]
  naturezaJuridica: string // sem campo na tela; segue vazio no envio
  abrangencia: string
  exigeIct: boolean
  tempoMinimoMeses: string
  faturamentoMinimo: string // sem campo na tela
  faturamentoMaximo: string // sem campo na tela
  certidoesExigidas: string
  areasTematicas: string
  submissaoMultipla: boolean
  resumoExecutivo: string
}

export const VALORES_UPLOAD_INICIAIS: ValoresUpload = { arquivo: null, fonteId: '' }

export const VALORES_URL_INICIAIS: ValoresUrl = { url: '', fonteId: '' }

export const VALORES_MANUAL_INICIAIS: ValoresManual = {
  fonteId: '',
  titulo: '',
  orgaoFinanciador: '',
  numeroEdital: '',
  modalidade: 'SUBVENCAO',
  dataPublicacao: '',
  prazoInscricao: '',
  dataResultado: '',
  valorTotal: '',
  valorMaximo: '',
  exigeContrapartida: false,
  percentualContrapartida: '',
  publicoAlvo: '',
  cnaesAceitos: '',
  portesAceitos: ['ME', 'EPP'],
  naturezaJuridica: '',
  abrangencia: 'Nacional',
  exigeIct: false,
  tempoMinimoMeses: '',
  faturamentoMinimo: '',
  faturamentoMaximo: '',
  certidoesExigidas: '',
  areasTematicas: 'ESG, Baterias elétricas, Energia sustentável',
  submissaoMultipla: false,
  resumoExecutivo: '',
}

// Executa a criação com indicador de progresso e, no sucesso, leva ao detalhe do edital.
export type Processar = (opcoes: {
  mensagemInicial: string
  mensagemSucesso: string
  erroPadrao: string
  executar: (avisar: (mensagem: string) => void) => Promise<CriarEditalResposta>
}) => void

export type PropsFormulario<V> = {
  fontes: FonteComExecucoes[]
  valores: V
  onAlterar: (parcial: Partial<V>) => void
  processando: boolean
  onErro: (mensagem: string | null) => void
  processar: Processar
}

// Props das seções do cadastro manual.
export type PropsSecao = {
  valores: ValoresManual
  onAlterar: (parcial: Partial<ValoresManual>) => void
  processando: boolean
}
