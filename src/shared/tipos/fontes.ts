// Contratos da API de fontes (/api/fontes).

import type { ColetaExecucao, Fonte, FormatoDadosFonte, TipoFonte } from './dominio.js'

export type { FormatoDadosFonte, IntegracaoFonte, StatusColeta, TipoFonte } from './dominio.js'

export type ExecucaoColeta = ColetaExecucao
export type FonteResumo = Fonte

export type FonteComExecucoes = FonteResumo & { execucoes: ExecucaoColeta[] }

// Integradas: órgãos com dados estruturados, criados pelo sistema. Adicionadas: páginas cadastradas pelo usuário.
export type ListaFontesResposta = { integradas: FonteComExecucoes[]; adicionadas: FonteComExecucoes[]; limite: number }

// A fonte só diz onde olhar e quando; quais links são chamadas a IA decide a cada coleta.
export type SalvarFonteEntrada = {
  id?: string
  nome: string
  url_base: string | null
  hora?: string // 'HH:MM' da coleta diária; ausente mantém o horário atual
  ativo: boolean
}

export type FonteResposta = { ok: true; fonte: FonteResumo }

/** O que um endereço é para o sistema: a lista de editais de um órgão, um edital específico ou outra coisa. */
export type TipoPaginaFonte = 'LISTA' | 'EDITAL' | 'OUTRA'

/** Resultado da verificação de um endereço (botões "Verificar página" e "Tentar achar"). Nada é gravado. */
export type VerificacaoFonte = {
  url: string
  tipo: TipoPaginaFonte
  motivo: string
  formato: FormatoDadosFonte // como a página foi lida: HTML, feed ou dados (JSON) do site
  encontradas: { titulo: string; url: string; numero: string | null }[]
  aviso: string | null
}

export type VerificacaoFonteResposta = { ok: true; verificacao: VerificacaoFonte }

export type ProcuraListagemResposta = {
  ok: true
  encontrada: VerificacaoFonte | null
  tentativas: { url: string; resultado: string }[]
}

export type ExcluirFonteResposta = { ok: true; mensagem: string }

/** De onde vieram os editais existentes (opções do filtro "Origem" da lista). */
export type OrigensResposta = { origens: { id: string; nome: string }[] }
