import type { Edital, Modalidade } from './entidades.js'
import { MODALIDADES } from '../shared/rotulos.js'

export const CAMPOS_EDITAVEIS = [
  'orgao_financiador',
  'numero_edital',
  'modalidade',
  'data_publicacao',
  'prazo_inscricao',
  'data_resultado_prevista',
  'valor_total_disponivel',
  'valor_maximo_por_projeto',
  'exige_contrapartida',
  'percentual_contrapartida',
  'publico_alvo',
  'cnaes_aceitos',
  'portes_aceitos',
  'abrangencia_geografica',
  'areas_tematicas',
  'resumo_executivo',
] as const

export type CampoEditavel = typeof CAMPOS_EDITAVEIS[number]
export const MARCADOR_EDICAO_MANUAL = 'Editado manualmente; sem evidência extraída do documento.'

export function validarCamposManuais(valor: unknown): Partial<Edital> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    throw new Error('Informe os campos que deseja atualizar.')
  }
  const entrada = valor as Record<string, unknown>
  const alteracoes: Partial<Edital> = {}
  const datas = new Set(['data_publicacao', 'prazo_inscricao', 'data_resultado_prevista'])
  const valoresMonetarios = new Set(['valor_total_disponivel', 'valor_maximo_por_projeto'])
  const listas = new Set(['publico_alvo', 'cnaes_aceitos', 'portes_aceitos', 'abrangencia_geografica', 'areas_tematicas'])

  for (const [campo, item] of Object.entries(entrada)) {
    if (!(CAMPOS_EDITAVEIS as readonly string[]).includes(campo)) {
      throw new Error(`O campo "${campo}" não pode ser editado por este formulário.`)
    }
    if (item === null || item === '') {
      Object.assign(alteracoes, { [campo]: null })
      continue
    }
    if (campo === 'orgao_financiador' || campo === 'numero_edital' || campo === 'resumo_executivo') {
      if (typeof item !== 'string' || item.trim().length > 20_000) throw new Error(`Valor inválido para ${campo}.`)
      Object.assign(alteracoes, { [campo]: item.trim() || null })
    } else if (campo === 'modalidade') {
      if (typeof item !== 'string' || !Object.hasOwn(MODALIDADES, item)) throw new Error('Modalidade inválida.')
      Object.assign(alteracoes, { modalidade: item as Modalidade })
    } else if (datas.has(campo)) {
      if (
        typeof item !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(item) ||
        Number.isNaN(Date.parse(`${item}T00:00:00Z`)) ||
        new Date(`${item}T00:00:00Z`).toISOString().slice(0, 10) !== item
      ) {
        throw new Error(`Informe uma data válida para ${campo} no formato AAAA-MM-DD.`)
      }
      Object.assign(alteracoes, { [campo]: item })
    } else if (valoresMonetarios.has(campo) || campo === 'percentual_contrapartida') {
      if (typeof item !== 'number' || !Number.isFinite(item) || item < 0 || (campo === 'percentual_contrapartida' && item > 100)) {
        throw new Error(`Informe um número válido para ${campo}.`)
      }
      Object.assign(alteracoes, { [campo]: item })
    } else if (campo === 'exige_contrapartida') {
      if (typeof item !== 'boolean') throw new Error(`Informe Sim ou Não para ${campo}.`)
      Object.assign(alteracoes, { exige_contrapartida: item })
    } else if (listas.has(campo)) {
      if (!Array.isArray(item) || item.length > 100 || item.some((elemento) => typeof elemento !== 'string' || elemento.length > 500)) {
        throw new Error(`Informe uma lista de textos válida para ${campo}.`)
      }
      Object.assign(alteracoes, { [campo]: item.map((elemento) => elemento.trim()).filter(Boolean) })
    }
  }
  if (!Object.keys(alteracoes).length) throw new Error('Informe ao menos um campo para salvar.')
  return alteracoes
}
