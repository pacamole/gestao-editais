import type { TipoFonte } from '../../dominio/entidades.js'

export const FREQUENCIA_COLETA_PADRAO = '0 6 * * *'

// Fontes sem coletor automático: os editais delas entram por upload ou colando o link.
export const FONTES_MANUAIS = ['BNDES', 'Fundação Araucária', 'Fomento Paraná', 'Copel', 'Diário Oficial do PR']

// Fontes de quem envia o edital à mão: o PDF enviado e o link colado.
export const FONTES_ENTRADA_MANUAL: { nome: string; tipo: TipoFonte }[] = [
  { nome: 'Upload manual', tipo: 'UPLOAD_MANUAL' },
  { nome: 'URL manual', tipo: 'URL_MANUAL' },
]
