import { CAMPOS_EDITAVEIS, type CampoEditavel } from '../../../shared/camposEditaveis.js'
import { CAMPOS_EDITAL } from '../../../shared/rotulos.js'
import { normalizarValor, type ValorCampo } from '../../../shared/valoresCampo.js'
import { secoesDoTexto } from '../../dominio/textoEdital.js'

// Tudo o que o catálogo permite preencher é extraído.
export const CAMPOS_PARA_EXTRAIR = CAMPOS_EDITAVEIS

export type CampoEditalExtraido = CampoEditavel
export type ValorCampoEditalExtraido = ValorCampo
export type ResultadoExtracaoEdital = {
  campos: Partial<Record<CampoEditalExtraido, ValorCampoEditalExtraido>>
  evidencias: Partial<Record<CampoEditalExtraido, { trecho: string; pagina: number | null }>>
}

function normalizarEvidencia(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim()
}

// O modelo costuma juntar trechos com "..."; cada parte precisa estar literalmente na mesma página.
function contemEvidencia(texto: string, partes: string[]): boolean {
  const normalizado = normalizarEvidencia(texto)
  return partes.every((parte) => normalizado.includes(parte))
}

// Página do PDF onde a evidência está; null quando está numa parte sem página (página lida, texto da fonte).
function encontrarEvidencia(texto: string, evidencia: string): number | null | undefined {
  const partes = evidencia.split(/\.{3}|…/).map(normalizarEvidencia).filter((parte) => parte.length >= 3)
  if (!partes.length) return undefined
  const secoes = secoesDoTexto(texto)
  const comPagina = secoes.find((secao) => secao.pagina != null && contemEvidencia(secao.conteudo, partes))
  if (comPagina) return comPagina.pagina
  return secoes.some((secao) => secao.pagina == null && contemEvidencia(secao.conteudo, partes)) ? null : undefined
}

function normalizarValorCampo(campo: CampoEditalExtraido, valor: unknown): ValorCampoEditalExtraido | undefined {
  if (valor === null) return null
  const resultado = normalizarValor(CAMPOS_EDITAL[campo].tipo, valor)
  return resultado.ok ? resultado.valor : undefined
}

// Converte o JSON devolvido pelo modelo em campos válidos. Descarta o que não tiver evidência literal no texto.
export function interpretarExtracao(dados: Record<string, unknown>, textoEdital: string): ResultadoExtracaoEdital {
  const campos: ResultadoExtracaoEdital['campos'] = {}
  const evidencias: ResultadoExtracaoEdital['evidencias'] = {}
  for (const campo of CAMPOS_PARA_EXTRAIR) {
    const item = dados[campo]
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const registro = item as Record<string, unknown>
    const valor = normalizarValorCampo(campo, registro.valor)
    if (valor === undefined || valor === null) continue
    const trecho = typeof registro.evidencia === 'string' ? registro.evidencia.trim() : ''
    const pagina = encontrarEvidencia(textoEdital, trecho)
    if (pagina === undefined) continue
    campos[campo] = valor
    evidencias[campo] = { trecho, pagina }
  }
  return { campos, evidencias }
}
