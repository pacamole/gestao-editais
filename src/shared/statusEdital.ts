// Ciclo de vida do edital: quais status existem em grupo e quais mudanças são permitidas.
// Regras puras, usadas pelo servidor (que valida) e pelo cliente (que mostra só os botões que valem).

import type { StatusEdital } from './tipos/dominio.js'

// ---- Grupos (fonte única; substituem as listas soltas pelo código) ----

export const STATUS_EM_PROCESSAMENTO: readonly StatusEdital[] = ['COLETADO', 'EM_ANALISE', 'FALHA']
export const STATUS_AGUARDANDO_DECISAO: readonly StatusEdital[] = ['ANALISADO', 'EM_REVISAO']
/** Editais ainda em jogo: podem expirar, ser reavaliados e ser decididos. */
export const STATUS_ATIVOS: readonly StatusEdital[] = [...STATUS_EM_PROCESSAMENTO, ...STATUS_AGUARDANDO_DECISAO, 'APROVADO']
/** Descartado pelo filtro de relevância; não conta como em andamento e só volta pelo "Resgatar". */
export const STATUS_FORA_DO_PERFIL: StatusEdital = 'FORA_DO_PERFIL'
export const STATUS_FINAIS: readonly StatusEdital[] = ['DESCARTADO', 'INSCRITO', 'ENCERRADO', 'EXPIRADO']

// ---- Ações do usuário ----

export type AcaoTransicao = 'APROVOU' | 'DESCARTOU' | 'MARCOU_INSCRITO' | 'REGISTROU_RESULTADO' | 'REABRIU' | 'RESGATOU'

type Regra = { de: readonly StatusEdital[]; para: StatusEdital; motivo: string }

const REGRAS: Record<AcaoTransicao, Regra> = {
  APROVOU: {
    de: ['COLETADO', 'FALHA', 'ANALISADO', 'EM_REVISAO'],
    para: 'APROVADO',
    motivo: 'Só é possível aprovar um edital que ainda aguarda decisão.',
  },
  DESCARTOU: {
    de: STATUS_ATIVOS,
    para: 'DESCARTADO',
    motivo: 'Só é possível descartar um edital que ainda está em andamento.',
  },
  MARCOU_INSCRITO: {
    de: ['APROVADO'],
    para: 'INSCRITO',
    motivo: 'Só é possível marcar como inscrito um edital aprovado.',
  },
  REGISTROU_RESULTADO: {
    de: ['INSCRITO'],
    para: 'ENCERRADO',
    motivo: 'Só é possível registrar o resultado de um edital em que a inscrição foi feita.',
  },
  REABRIU: {
    de: ['DESCARTADO', 'EXPIRADO'],
    para: 'EM_REVISAO',
    motivo: 'Só é possível reabrir um edital descartado ou expirado.',
  },
  RESGATOU: {
    de: ['FORA_DO_PERFIL'],
    para: 'COLETADO',
    motivo: 'Só é possível resgatar um edital que o filtro deixou fora do perfil.',
  },
}

export const ACOES_TRANSICAO = Object.keys(REGRAS) as AcaoTransicao[]

export function ehAcaoTransicao(valor: unknown): valor is AcaoTransicao {
  return typeof valor === 'string' && Object.hasOwn(REGRAS, valor)
}

/** Ações que o usuário pode executar sobre um edital neste status (o cliente monta os botões com isto). */
export function acoesPermitidas(status: StatusEdital): AcaoTransicao[] {
  return ACOES_TRANSICAO.filter((acao) => REGRAS[acao].de.includes(status))
}

export type ResultadoTransicao = { ok: true; novo: StatusEdital } | { ok: false; motivo: string }

export function transicionar(status: StatusEdital, acao: AcaoTransicao): ResultadoTransicao {
  const regra = REGRAS[acao]
  return regra.de.includes(status) ? { ok: true, novo: regra.para } : { ok: false, motivo: regra.motivo }
}

// ---- Transições do sistema (processamento e reavaliação automáticos) ----

const TRANSICOES_SISTEMA: Record<StatusEdital, readonly StatusEdital[]> = {
  COLETADO: ['EM_ANALISE', 'FORA_DO_PERFIL', 'EXPIRADO'],
  EM_ANALISE: ['ANALISADO', 'EM_REVISAO', 'FALHA', 'EXPIRADO'],
  ANALISADO: ['COLETADO', 'EM_REVISAO', 'EXPIRADO'],
  FALHA: ['COLETADO', 'EM_ANALISE', 'EXPIRADO'],
  EM_REVISAO: ['COLETADO', 'ANALISADO', 'EXPIRADO'],
  APROVADO: ['EXPIRADO'],
  DESCARTADO: [],
  INSCRITO: [],
  ENCERRADO: [],
  EXPIRADO: [],
  FORA_DO_PERFIL: [],
}

export function podeTransicionarSistema(de: StatusEdital, para: StatusEdital): boolean {
  return TRANSICOES_SISTEMA[de].includes(para)
}
