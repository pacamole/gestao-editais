import type { StatusElegibilidade } from './dominio.js'

export type StatusRequisitoTriagem = 'ATENDE' | 'NAO_ATENDE' | 'INDETERMINADO'

export type RequisitoTriagem = {
  pergunta: string
  status: StatusRequisitoTriagem
  comparativo_perfil: string
  comparativo_site: string
  fontes_site?: string[]
  evidencia_edital: string
}

export type AnaliseElegibilidade = {
  status: StatusElegibilidade
  resumo: string
  requisitos: RequisitoTriagem[]
  paginas_site_lidas: number
  paginas_site_enviadas: number
  aviso_leitura: string | null
  criado_em: string
}
