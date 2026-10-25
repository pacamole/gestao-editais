// Conversão e validação de um valor de campo do edital, por tipo do catálogo (rotulos.ts).
// Uma só regra para a edição manual, o cadastro manual e a leitura por IA.

import { ehDataCivil } from './datas.js'
import { MODALIDADES, type TipoCampo } from './rotulos.js'

export type ValorCampo = string | number | boolean | string[] | null

export type ResultadoValor = { ok: true; valor: ValorCampo } | { ok: false; motivo: string }

export type OpcoesValor = {
  /** Texto solto em campo de lista: true separa por vírgula/ponto e vírgula; false vira um único item. */
  separarTexto?: boolean
}

const LIMITE_TEXTO = 20_000
const LIMITE_ITENS_LISTA = 100
const LIMITE_ITEM_LISTA = 500

const ok = (valor: ValorCampo): ResultadoValor => ({ ok: true, valor })
const erro = (motivo: string): ResultadoValor => ({ ok: false, motivo })

// Aceita número ou texto numérico ("1500"); vazio ou texto qualquer não vira zero.
function comoNumero(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null
  if (typeof valor === 'string' && valor.trim()) {
    const n = Number(valor.trim())
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** Vazio (null, undefined, '') vale "não informado" para qualquer tipo. */
export function normalizarValor(tipo: TipoCampo, valor: unknown, opcoes: OpcoesValor = {}): ResultadoValor {
  if (valor === null || valor === undefined || valor === '') return ok(null)

  switch (tipo) {
    case 'texto': {
      if (typeof valor !== 'string' || valor.length > LIMITE_TEXTO) return erro('informe um texto válido.')
      return ok(valor.trim() || null)
    }
    case 'modalidade':
      return typeof valor === 'string' && Object.hasOwn(MODALIDADES, valor) ? ok(valor) : erro('modalidade inválida.')
    case 'data':
      return ehDataCivil(valor) ? ok(valor) : erro('informe uma data válida no formato AAAA-MM-DD.')
    case 'moeda': {
      const n = comoNumero(valor)
      return n !== null && n >= 0 ? ok(n) : erro('informe um valor em reais maior ou igual a zero.')
    }
    case 'percentual': {
      const n = comoNumero(valor)
      return n !== null && n >= 0 && n <= 100 ? ok(n) : erro('informe um percentual de 0 a 100.')
    }
    case 'inteiro': {
      const n = comoNumero(valor)
      return n !== null && Number.isInteger(n) && n >= 0 ? ok(n) : erro('informe um número inteiro maior ou igual a zero.')
    }
    case 'booleano':
      return typeof valor === 'boolean' ? ok(valor) : erro('informe Sim ou Não.')
    case 'lista': {
      const itens = typeof valor === 'string' ? (opcoes.separarTexto ? valor.split(/[,;]/) : [valor]) : valor
      if (
        !Array.isArray(itens) ||
        itens.length > LIMITE_ITENS_LISTA ||
        itens.some((item) => typeof item !== 'string' || item.length > LIMITE_ITEM_LISTA)
      ) {
        return erro('informe uma lista de textos válida.')
      }
      return ok(itens.map((item) => (item as string).trim()).filter(Boolean))
    }
  }
}
