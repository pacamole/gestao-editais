// Campos do edital que a edição manual e a extração por IA podem preencher: todos os do catálogo, menos o título.
import { CAMPOS_EDITAL, type NomeCampoEdital } from './rotulos.js'

export type CampoEditavel = Exclude<NomeCampoEdital, 'titulo'>

export const CAMPOS_EDITAVEIS = (Object.keys(CAMPOS_EDITAL) as NomeCampoEdital[]).filter(
  (campo): campo is CampoEditavel => campo !== 'titulo',
)

// Trecho gravado como evidência quando o campo foi editado à mão.
export const MARCADOR_EDICAO_MANUAL = 'Editado manualmente; sem evidência extraída do documento.'
