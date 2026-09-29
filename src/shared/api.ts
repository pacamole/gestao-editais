// Tipos compartilhados entre cliente e servidor.

export type HealthResponse = {
  ok: true
  time: string
}

export type ErroApi = {
  erro: string
}

// ---- Compartilhamento da base ----

export type TabelaResumo = {
  nome: string
  registros: number
}

export type ResultadoExportacao = {
  arquivo: string
  tamanhoBytes: number
  tabelas: TabelaResumo[]
}

export type ResultadoImportacao = {
  // Cópia da base anterior, gravada antes de substituir os dados.
  backup: string
  tabelas: TabelaResumo[]
}
