// Campos do edital que a edição manual e a extração por IA podem preencher: todos os do catálogo, menos o título.
import { CAMPOS_EDITAL, type NomeCampoEdital } from './rotulos.js'

export type CampoEditavel = Exclude<NomeCampoEdital, 'titulo'>

export const CAMPOS_EDITAVEIS = (Object.keys(CAMPOS_EDITAL) as NomeCampoEdital[]).filter(
  (campo): campo is CampoEditavel => campo !== 'titulo',
)

// Trecho gravado como evidência quando o campo foi editado à mão.
export const MARCADOR_EDICAO_MANUAL = 'Editado manualmente; sem evidência extraída do documento.'

// Trecho gravado como evidência quando o campo veio pronto da fonte (ex.: API da FINEP), não do texto do edital.
export const MARCADOR_DADO_ESTRUTURADO = 'Dado estruturado informado pela fonte.'

/** Campo preenchido à mão ou pela fonte: a IA não o refaz. */
export const evidenciaProtegida = (trecho: string) => trecho === MARCADOR_EDICAO_MANUAL || trecho === MARCADOR_DADO_ESTRUTURADO
