import { CAMPOS_EDITAL, MODALIDADES, type NomeCampoEdital } from '../../shared/rotulos.js'
import type { Edital } from '../entidades.js'

const FUSO = 'America/Sao_Paulo'
const DIA_MS = 86_400_000
const DIAS_SEMANA = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const NAO_LOCALIZADO = 'Não localizado no documento'

// Instante convertido para o horário de Brasília.
export type HoraLocal = {
  dia: string // AAAA-MM-DD
  diaSemana: number // 0 = domingo
  hora: string // HH:MM
}

// Formatação de valores para texto em pt-BR, no fuso de Brasília.
export class Formato {
  private static readonly fmtDataHora = new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO,
    dateStyle: 'short',
    timeStyle: 'short',
  })
  private static readonly fmtMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  private static readonly fmtNumero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
  private static readonly fmtPartes = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  static horaLocal(instante: Date): HoraLocal {
    const p = Object.fromEntries(Formato.fmtPartes.formatToParts(instante).map((x) => [x.type, x.value]))
    return {
      dia: `${p.year}-${p.month}-${p.day}`,
      diaSemana: DIAS_SEMANA.indexOf(p.weekday ?? ''),
      hora: `${p.hour}:${p.minute}`,
    }
  }

  // Dias de calendário entre hoje e a data do prazo (negativo se já passou).
  static diasAte(prazoIso: string, hoje = new Date()): number {
    const prazo = Formato.horaLocal(new Date(prazoIso)).dia
    const atual = Formato.horaLocal(hoje).dia
    return Math.round((Date.parse(prazo) - Date.parse(atual)) / DIA_MS)
  }

  // Aceita "AAAA-MM-DD" (coluna date) ou ISO completo (timestamptz).
  static data(valor: string | null): string {
    if (valor === null) return NAO_LOCALIZADO
    const dia = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : Formato.horaLocal(new Date(valor)).dia
    return dia.split('-').reverse().join('/')
  }

  static dataHora(iso: string | null): string {
    return iso === null ? NAO_LOCALIZADO : Formato.fmtDataHora.format(new Date(iso))
  }

  static prazoComDias(iso: string | null): string {
    if (iso === null) return NAO_LOCALIZADO
    return `${Formato.dataHora(iso)} (${Formato.diasAte(iso)} dias restantes)`
  }

  static moeda(valor: number | null): string {
    return valor === null ? NAO_LOCALIZADO : Formato.fmtMoeda.format(valor)
  }

  static numero(valor: number): string {
    return Formato.fmtNumero.format(valor)
  }

  static nota(valor: number | null): string {
    return valor === null ? 'sem nota' : `${Formato.numero(valor)}/100`
  }

  static tituloCurto(titulo: string, maximo = 60): string {
    return titulo.length <= maximo ? titulo : `${titulo.slice(0, maximo - 1).trimEnd()}…`
  }

  static valorCampo(campo: NomeCampoEdital, valor: Edital[NomeCampoEdital]): string {
    if (valor === null) return NAO_LOCALIZADO
    if (Array.isArray(valor)) return valor.length ? valor.join(', ') : 'Sem restrição'
    if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não'
    switch (CAMPOS_EDITAL[campo].tipo) {
      case 'moeda':
        return Formato.moeda(Number(valor))
      case 'percentual':
        return `${Formato.numero(Number(valor))}%`
      case 'inteiro':
        return String(valor)
      case 'data':
        return Formato.data(String(valor))
      case 'dataHora':
        return Formato.dataHora(String(valor))
      case 'modalidade':
        return MODALIDADES[String(valor)] ?? String(valor)
      default:
        return String(valor)
    }
  }

  // Bloco "  Rótulo ....... valor", alinhado pelo maior rótulo.
  static campos(pares: [rotulo: string, valor: string][]): string {
    const largura = Math.max(...pares.map(([rotulo]) => rotulo.length)) + 4
    return pares
      .map(([rotulo, valor]) => `  ${rotulo} ${'.'.repeat(largura - rotulo.length - 1)} ${valor}`)
      .join('\n')
  }
}
