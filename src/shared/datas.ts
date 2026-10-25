// Datas civis no fuso de Brasília. Prazos são guardados como 'AAAA-MM-DD' (um dia no calendário, sem hora):
// converter isso com `new Date()` o trata como UTC e desloca o dia. Toda conta de data passa por aqui.
// Funções puras, usadas pelo servidor e pelo cliente.

/** 'AAAA-MM-DD': dia no calendário de Brasília. */
export type DataCivil = string

export const FUSO = 'America/Sao_Paulo'

const DIA_MS = 86_400_000
const DIAS_SEMANA = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const PADRAO_DATA_CIVIL = /^\d{4}-\d{2}-\d{2}$/

const formatoPartes = new Intl.DateTimeFormat('en-US', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const meiaNoiteUtc = (data: DataCivil) => Date.parse(`${data}T00:00:00Z`)

/** O instante convertido para o horário de Brasília. */
export type HoraLocal = {
  dia: DataCivil
  diaSemana: number // 0 = domingo
  hora: string // HH:MM
}

export function horaLocal(instante: Date): HoraLocal {
  const p = Object.fromEntries(formatoPartes.formatToParts(instante).map((x) => [x.type, x.value]))
  return {
    dia: `${p.year}-${p.month}-${p.day}`,
    diaSemana: DIAS_SEMANA.indexOf(p.weekday ?? ''),
    hora: `${p.hour}:${p.minute}`,
  }
}

/** Formato AAAA-MM-DD e dia existente no calendário (rejeita 2026-02-30). */
export function ehDataCivil(valor: unknown): valor is DataCivil {
  if (typeof valor !== 'string' || !PADRAO_DATA_CIVIL.test(valor)) return false
  const t = meiaNoiteUtc(valor)
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === valor
}

/** 'AAAA-MM-DD' passa direto; um instante ISO vira o dia em Brasília; qualquer outra coisa, null. */
export function paraDataCivil(valor: string | null | undefined): DataCivil | null {
  if (!valor) return null
  if (PADRAO_DATA_CIVIL.test(valor)) return ehDataCivil(valor) ? valor : null
  const t = Date.parse(valor)
  return Number.isFinite(t) ? horaLocal(new Date(t)).dia : null
}

export function hoje(instante = new Date()): DataCivil {
  return horaLocal(instante).dia
}

export function somarDias(data: DataCivil, dias: number): DataCivil {
  return new Date(meiaNoiteUtc(data) + dias * DIA_MS).toISOString().slice(0, 10)
}

/** Dias de calendário de `de` até `ate` (negativo se `ate` é anterior). */
export function diasEntre(de: DataCivil, ate: DataCivil): number {
  return Math.round((meiaNoiteUtc(ate) - meiaNoiteUtc(de)) / DIA_MS)
}

/** Dias de hoje até o prazo (negativo = já passou). NaN se o prazo não for uma data. */
export function diasAte(prazo: string, instante = new Date()): number {
  const data = paraDataCivil(prazo)
  return data ? diasEntre(hoje(instante), data) : Number.NaN
}

/** O prazo vence ao fim do dia: no dia do prazo ainda está aberto. */
export function prazoVencido(prazo: string | null | undefined, instante = new Date()): boolean {
  const data = paraDataCivil(prazo)
  return data !== null && hoje(instante) > data
}

/** Início do dia de Brasília que contém o instante, como instante ISO (UTC). */
export function inicioDoDia(instante = new Date()): string {
  // Brasília não tem horário de verão desde 2019: o fuso é fixo em UTC-3.
  return new Date(`${hoje(instante)}T03:00:00.000Z`).toISOString()
}
