// Motor de critérios (§8): compara um campo do edital com uma referência (campo do perfil
// ou valor fixo) segundo o operador. Funções puras; não acessam o banco.
// O comportamento depende só do tipo dos campos (catálogo) e do operador — nunca do nome do critério.

import {
  CAMPOS_CRITERIO_EDITAL,
  CAMPOS_CRITERIO_PERFIL,
  FAIXAS_EDITAL,
  OPERADORES,
  type TipoComparavel,
} from '../../shared/catalogoCriterios.js'
import type { Criterio, Edital, PerfilEmpresa } from '../dominio/entidades.js'
import { normalizarLista } from '../util/listas.js'

const DIA_MS = 86_400_000

export type ResultadoEliminatorio =
  | { resultado: 'PASSA' }
  | { resultado: 'REPROVA'; motivo: string }
  | { resultado: 'INDETERMINADO'; campo_faltante: string }

// ---- Normalização ----

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
// Chave de comparação de itens: ignora caixa, acentos e pontuação ("5821-1/00" = "5821100", "pr" = "PR").
const chave = (s: string) => semAcento(s).replace(/[^a-z0-9]/g, '')
const dia = (d: Date) => d.toISOString().slice(0, 10)
const diasEntre = (de: string, ate: string) => Math.round((Date.parse(ate) - Date.parse(de)) / DIA_MS)
const limitar = (p: number) => Math.max(0, Math.min(1, p))

// ---- Resolução dos valores ----

// Valor do edital convertido para o tipo de comparação; null = não localizado no documento.
function valorEdital(edital: Edital, campo: string): unknown {
  const tipo = CAMPOS_CRITERIO_EDITAL[campo]?.tipo
  const bruto = (edital as Record<string, unknown>)[campo]
  if (bruto == null || bruto === '') return null
  return converter(bruto, tipo)
}

function converter(bruto: unknown, tipo: TipoComparavel | undefined): unknown {
  if (bruto == null || bruto === '') return null
  switch (tipo) {
    case 'lista':
      return normalizarLista(bruto)
    case 'numero':
    case 'dias': {
      const n = Number(bruto)
      return Number.isFinite(n) ? n : null
    }
    case 'data': {
      const t = Date.parse(String(bruto))
      return Number.isFinite(t) ? String(bruto).slice(0, 10) : null
    }
    case 'booleano':
      return typeof bruto === 'boolean' ? bruto : ['1', 'true', 'sim'].includes(semAcento(String(bruto)))
    default:
      return String(bruto)
  }
}

// Campos do perfil que não existem na tabela e são calculados na hora.
function valorPerfilDerivado(campo: string, perfil: PerfilEmpresa, agora: Date): unknown {
  if (campo === 'hoje') return dia(agora)
  if (campo === 'meses_desde_fundacao') {
    const fundacao = new Date(perfil.data_fundacao)
    if (Number.isNaN(fundacao.getTime())) return null
    const meses = (agora.getUTCFullYear() - fundacao.getUTCFullYear()) * 12 + (agora.getUTCMonth() - fundacao.getUTCMonth())
    return agora.getUTCDate() < fundacao.getUTCDate() ? meses - 1 : meses
  }
  return (perfil as Record<string, unknown>)[campo]
}

// Referência do critério no tipo do campo do edital; null = a empresa não informou (critério não se aplica).
function referencia(criterio: Criterio, perfil: PerfilEmpresa, agora: Date): unknown {
  const tipoEdital = CAMPOS_CRITERIO_EDITAL[criterio.campo_edital]?.tipo
  if (!criterio.campo_perfil) {
    const fixo = criterio.valor_referencia?.trim()
    if (!fixo) return null
    // Valor fixo em campo de texto pode listar alternativas: "SUBVENCAO, CREDITO".
    return converter(fixo, tipoEdital === 'texto' ? 'lista' : tipoEdital)
  }

  const tipoPerfil = CAMPOS_CRITERIO_PERFIL[criterio.campo_perfil]?.tipo
  const valor = converter(valorPerfilDerivado(criterio.campo_perfil, perfil, agora), tipoPerfil)
  if (valor == null) return null
  // Dias de preparo contra uma data do edital: a data de referência é hoje + N dias.
  if (tipoPerfil === 'dias' && tipoEdital === 'data') return dia(new Date(agora.getTime() + Number(valor) * DIA_MS))
  if (tipoEdital === 'lista' || tipoEdital === 'texto') return normalizarLista(Array.isArray(valor) ? valor : [valor])
  return valor
}

// ---- Primitivas de comparação ----

// Fração dos itens de `procurados` presentes em `alvo` (lista de itens ou texto livre).
function fracaoEncontrada(procurados: string[], alvo: string[] | string): number {
  if (!procurados.length) return 0
  const achou =
    typeof alvo === 'string'
      ? (item: string) => semAcento(alvo).includes(semAcento(item))
      : (item: string) => new Set(alvo.map(chave)).has(chave(item))
  return procurados.filter(achou).length / procurados.length
}

function igual(e: unknown, r: unknown): boolean {
  if (typeof e === 'number') return e === Number(r)
  return (r as string[]).some((item) => chave(item) === chave(String(e)))
}

function faixaDoEdital(criterio: Criterio, edital: Edital): { min: number | null; max: number | null } {
  const campoMax = FAIXAS_EDITAL[criterio.campo_edital]
  return {
    min: valorEdital(edital, criterio.campo_edital) as number | null,
    max: campoMax ? (valorEdital(edital, campoMax) as number | null) : null,
  }
}

const rotuloEdital = (criterio: Criterio) => CAMPOS_CRITERIO_EDITAL[criterio.campo_edital]?.rotulo ?? criterio.campo_edital
const rotuloReferencia = (criterio: Criterio) =>
  criterio.campo_perfil ? (CAMPOS_CRITERIO_PERFIL[criterio.campo_perfil]?.rotulo ?? criterio.campo_perfil) : `"${criterio.valor_referencia}"`

// ---- Eliminatórios ----

// Verdadeiro se o edital atende ao critério. Pressupõe e e r não nulos (exceto booleanos, onde r é opcional).
function atende(criterio: Criterio, e: unknown, r: unknown, edital: Edital): boolean {
  switch (criterio.operador) {
    case 'LISTA_VAZIA_OU_CONTEM':
      return (e as string[]).length === 0 || fracaoEncontrada(r as string[], e as string[]) > 0
    case 'CONTEM':
    case 'INTERSECCAO':
      return fracaoEncontrada(r as string[], e as string[] | string) > 0
    case 'NAO_CONTEM':
      return fracaoEncontrada(r as string[], e as string[] | string) === 0
    case 'CONTIDO_EM':
      // Tudo o que o edital exige, a empresa tem.
      return fracaoEncontrada(e as string[], r as string[]) === 1 || (e as string[]).length === 0
    case 'IGUAL':
      return igual(e, r)
    case 'DIFERENTE':
      return !igual(e, r)
    case 'MAIOR_QUE':
      return (e as number | string) >= (r as number | string)
    case 'MENOR_QUE':
      return (e as number | string) <= (r as number | string)
    case 'ENTRE': {
      const { min, max } = faixaDoEdital(criterio, edital)
      return (min == null || (r as number) >= min) && (max == null || (r as number) <= max)
    }
    case 'VERDADEIRO':
      return e === true
    case 'FALSO':
      // O edital não exige, ou a empresa atende à exigência (ex.: exige ICT e a empresa tem).
      return e === false || r === true
  }
}

// O edital tem o valor que o critério precisa? (ENTRE aceita faixa aberta de um dos lados.)
function valorDoEditalFaltando(criterio: Criterio, edital: Edital, e: unknown): boolean {
  if (criterio.operador === 'ENTRE') {
    const { min, max } = faixaDoEdital(criterio, edital)
    return min == null && max == null
  }
  return e == null
}

const referenciaOpcional = (criterio: Criterio) => criterio.operador === 'VERDADEIRO' || criterio.operador === 'FALSO'

export function avaliarEliminatorio(criterio: Criterio, edital: Edital, perfil: PerfilEmpresa, agora = new Date()): ResultadoEliminatorio {
  const e = valorEdital(edital, criterio.campo_edital)
  if (valorDoEditalFaltando(criterio, edital, e)) {
    return { resultado: 'INDETERMINADO', campo_faltante: rotuloEdital(criterio) }
  }
  const r = referencia(criterio, perfil, agora)
  // Sem referência a empresa não declarou restrição: o critério não se aplica.
  if (!referenciaOpcional(criterio) && (r == null || (Array.isArray(r) && !r.length))) return { resultado: 'PASSA' }
  if (atende(criterio, e, r, edital)) return { resultado: 'PASSA' }
  return {
    resultado: 'REPROVA',
    motivo: criterio.mensagem_reprovacao ?? `${rotuloEdital(criterio)} não ${OPERADORES[criterio.operador]} ${rotuloReferencia(criterio)}.`,
  }
}

// ---- Pontuáveis ----

// Pontuação em [0, 1]; null = sem dado para pontuar (sai do numerador e do denominador).
export function pontuar(criterio: Criterio, edital: Edital, perfil: PerfilEmpresa, agora = new Date()): number | null {
  const e = valorEdital(edital, criterio.campo_edital)
  if (valorDoEditalFaltando(criterio, edital, e)) return null
  const r = referencia(criterio, perfil, agora)
  if (!referenciaOpcional(criterio) && (r == null || (Array.isArray(r) && !r.length))) return null

  const tipoEdital = CAMPOS_CRITERIO_EDITAL[criterio.campo_edital]?.tipo
  switch (criterio.operador) {
    case 'CONTEM':
      return fracaoEncontrada(r as string[], e as string[] | string)
    case 'NAO_CONTEM':
      return 1 - fracaoEncontrada(r as string[], e as string[] | string)
    case 'INTERSECCAO':
      // Quanto do que o edital pede está nas áreas da empresa.
      return (e as string[]).length ? fracaoEncontrada(e as string[], r as string[]) : null
    case 'CONTIDO_EM':
      return (e as string[]).length ? fracaoEncontrada(e as string[], r as string[]) : 1
    case 'MAIOR_QUE': {
      // Proporcional até atingir a referência: metade do valor de interesse vale 0,5.
      if (tipoEdital === 'data') {
        const hoje = dia(agora)
        const alvo = diasEntre(hoje, r as string)
        return alvo > 0 ? limitar(diasEntre(hoje, e as string) / alvo) : atende(criterio, e, r, edital) ? 1 : 0
      }
      return (r as number) > 0 ? limitar((e as number) / (r as number)) : atende(criterio, e, r, edital) ? 1 : 0
    }
    case 'MENOR_QUE': {
      // Acima do limite perde proporcionalmente: exigir o dobro da capacidade vale 0,5.
      if (atende(criterio, e, r, edital)) return 1
      return tipoEdital === 'data' ? 0 : limitar((r as number) / (e as number))
    }
    default:
      return atende(criterio, e, r, edital) ? 1 : 0
  }
}
