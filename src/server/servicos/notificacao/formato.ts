import { CAMPOS_EDITAL, MODALIDADES, type NomeCampoEdital } from '../../../shared/rotulos.js'
import type { Edital } from '../../dominio/entidades.js'
import { diasAte, horaLocal, paraDataCivil, type HoraLocal } from '../../../shared/datas.js'

const FUSO = 'America/Sao_Paulo'
const DIA_MS = 86_400_000

export const NAO_LOCALIZADO = 'Não localizado no documento'

export type { HoraLocal }

// Formatação de valores para texto em pt-BR, no fuso de Brasília.
export class Formato {
  private static readonly fmtDataHora = new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO,
    dateStyle: 'short',
    timeStyle: 'short',
  })
  private static readonly fmtMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  private static readonly fmtNumero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

  static horaLocal(instante: Date): HoraLocal {
    return horaLocal(instante)
  }

  // Dias de calendário entre hoje e a data do prazo (negativo se já passou).
  static diasAte(prazo: string, hoje = new Date()): number {
    return diasAte(prazo, hoje)
  }

  // Aceita "AAAA-MM-DD" (coluna date) ou ISO completo (timestamptz).
  static data(valor: string | null): string {
    if (valor === null) return NAO_LOCALIZADO
    const dia = paraDataCivil(valor)
    return dia ? dia.split('-').reverse().join('/') : valor
  }

  static dataHora(iso: string | null): string {
    return iso === null ? NAO_LOCALIZADO : Formato.fmtDataHora.format(new Date(iso))
  }

  static prazoComDias(prazo: string | null): string {
    if (prazo === null) return NAO_LOCALIZADO
    return `${Formato.data(prazo)} (${Formato.diasAte(prazo)} dias restantes)`
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
