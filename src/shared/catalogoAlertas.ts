// Catálogo das notificações (P09): nomes, grupos, resumo legível e parâmetros.
// Fonte única para a tela de alertas, a validação da API e os gatilhos.

import type { TipoNotificacao } from './tipos/dominio.js'

// Parâmetros configuráveis de cada notificação, guardados em config_alerta.parametros.
export type ParametrosAlerta = {
  E01: { nota_minima: number }
  E02: { dias_antecedencia: number[] }
  E03: Record<string, never>
  E04: { dia_semana: number; hora: string } // dia_semana: 0 = domingo … 6 = sábado
  E05: { variacao_minima_nota: number }
  E06: { falhas_consecutivas: number }
}

export const PARAMETROS_PADRAO: ParametrosAlerta = {
  E01: { nota_minima: 70 },
  E02: { dias_antecedencia: [15, 7, 2] },
  E03: {},
  E04: { dia_semana: 1, hora: '08:00' },
  E05: { variacao_minima_nota: 10 },
  E06: { falhas_consecutivas: 2 },
}

export const TIPOS_NOTIFICACAO = Object.keys(PARAMETROS_PADRAO) as TipoNotificacao[]

export const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const

// Limites dos campos numéricos (inclusive).
export const LIMITES_ALERTA = {
  nota_minima: { min: 0, max: 100 },
  dias_antecedencia: { min: 1, max: 90 },
  variacao_minima_nota: { min: 1, max: 100 },
  falhas_consecutivas: { min: 1, max: 20 },
} as const

export type GrupoAlerta = 'Oportunidades' | 'Prazos e rotina' | 'Operação'
export const GRUPOS_ALERTA: GrupoAlerta[] = ['Oportunidades', 'Prazos e rotina', 'Operação']

type DefinicaoAlerta<T extends TipoNotificacao> = {
  nome: string
  grupo: GrupoAlerta
  // Frase curta com os valores atuais, para a lista de alertas.
  resumo: (p: ParametrosAlerta[T]) => string
}

function listaEmPortugues(itens: (string | number)[]): string {
  if (itens.length <= 1) return itens.join('')
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`
}

export const CATALOGO_ALERTAS: { [T in TipoNotificacao]: DefinicaoAlerta<T> } = {
  E01: {
    nome: 'Novo edital com fit alto',
    grupo: 'Oportunidades',
    resumo: (p) => `Edital elegível com nota de fit a partir de ${p.nota_minima}`,
  },
  E05: {
    nome: 'Edital retificado',
    grupo: 'Oportunidades',
    resumo: (p) => `Retificação que muda a nota em mais de ${p.variacao_minima_nota} pontos`,
  },
  E02: {
    nome: 'Prazo próximo',
    grupo: 'Prazos e rotina',
    resumo: (p) =>
      p.dias_antecedencia.length
        ? `Faltando ${listaEmPortugues(p.dias_antecedencia)} ${p.dias_antecedencia.length === 1 && p.dias_antecedencia[0] === 1 ? 'dia' : 'dias'} para o fim da inscrição`
        : 'Nenhum dia de antecedência definido',
  },
  E04: {
    nome: 'Resumo semanal',
    grupo: 'Prazos e rotina',
    resumo: (p) => `Toda ${(DIAS_SEMANA[p.dia_semana] ?? '?').toLocaleLowerCase('pt-BR')} às ${p.hora}`,
  },
  E03: {
    nome: 'Verificação necessária',
    grupo: 'Operação',
    resumo: () => 'Edital com critério que não pôde ser verificado automaticamente',
  },
  E06: {
    nome: 'Falha de coleta',
    grupo: 'Operação',
    resumo: (p) => `Após ${p.falhas_consecutivas} ${p.falhas_consecutivas === 1 ? 'falha' : 'falhas seguidas'} da mesma fonte`,
  },
}

export function resumoAlerta(tipo: TipoNotificacao, parametros: Record<string, unknown>): string {
  return (CATALOGO_ALERTAS[tipo].resumo as (p: unknown) => string)(parametros)
}

export class ErroParametroAlerta extends Error {}

function inteiro(valor: unknown, campo: keyof typeof LIMITES_ALERTA, rotulo: string): number {
  // Number('') seria 0: campo vazio é inválido, não zero.
  const numero = typeof valor === 'string' ? (valor.trim() ? Number(valor.trim()) : NaN) : valor
  const { min, max } = LIMITES_ALERTA[campo]
  if (typeof numero !== 'number' || !Number.isInteger(numero) || numero < min || numero > max) {
    throw new ErroParametroAlerta(`${rotulo}: informe um número inteiro de ${min} a ${max}.`)
  }
  return numero
}

// Aceita os formatos antigos gravados como texto ("15,7,2", "1") e devolve os tipos certos.
// Campos ausentes ficam com o valor padrão.
export function normalizarParametros<T extends TipoNotificacao>(tipo: T, entrada: unknown): ParametrosAlerta[T] {
  const bruto = { ...PARAMETROS_PADRAO[tipo], ...(entrada && typeof entrada === 'object' ? entrada : {}) } as Record<string, unknown>
  const resultado = ((): ParametrosAlerta[TipoNotificacao] => {
    switch (tipo) {
      case 'E01':
        return { nota_minima: inteiro(bruto.nota_minima, 'nota_minima', 'Nota mínima') }
      case 'E02': {
        const lista = typeof bruto.dias_antecedencia === 'string' ? bruto.dias_antecedencia.split(/[,;\s]+/).filter(Boolean) : bruto.dias_antecedencia
        if (!Array.isArray(lista) || !lista.length) throw new ErroParametroAlerta('Dias de antecedência: informe ao menos um dia.')
        const dias = lista.map((d) => inteiro(d, 'dias_antecedencia', 'Dias de antecedência'))
        return { dias_antecedencia: [...new Set(dias)].sort((a, b) => b - a) }
      }
      case 'E03':
        return {}
      case 'E04': {
        const dia = Number(bruto.dia_semana)
        if (!Number.isInteger(dia) || dia < 0 || dia > 6) throw new ErroParametroAlerta('Dia da semana inválido.')
        const hora = String(bruto.hora ?? '').trim()
        const partes = /^(\d{1,2}):(\d{2})$/.exec(hora)
        if (!partes || Number(partes[1]) > 23 || Number(partes[2]) > 59) throw new ErroParametroAlerta('Horário inválido: use HH:MM.')
        return { dia_semana: dia, hora: `${partes[1].padStart(2, '0')}:${partes[2]}` }
      }
      case 'E05':
        return { variacao_minima_nota: inteiro(bruto.variacao_minima_nota, 'variacao_minima_nota', 'Variação mínima da nota') }
      case 'E06':
        return { falhas_consecutivas: inteiro(bruto.falhas_consecutivas, 'falhas_consecutivas', 'Falhas seguidas') }
    }
  })()
  return resultado as ParametrosAlerta[T]
}

export function emailValido(email: string): boolean {
  return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(email)
}

// Lista de e-mails únicos, sem espaços; lança erro no primeiro inválido.
export function normalizarDestinatarios(entrada: unknown): string[] {
  if (!Array.isArray(entrada)) throw new ErroParametroAlerta('Destinatários devem ser uma lista de e-mails.')
  const emails = entrada.map((e) => String(e).trim()).filter(Boolean)
  const invalido = emails.find((e) => !emailValido(e))
  if (invalido) throw new ErroParametroAlerta(`E-mail inválido: ${invalido}`)
  return [...new Set(emails)]
}
