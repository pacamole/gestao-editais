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

// Base em uso agora (tela Configurações › Base de dados).
export type ResumoBase = {
  arquivo: string
  tamanhoBytes: number
  tabelas: TabelaResumo[]
}

// Backup gravado automaticamente antes de cada importação ou restauração.
export type BackupBase = {
  nome: string
  tamanhoBytes: number
  criadoEm: string
}

export type ListaBackupsResposta = { backups: BackupBase[] }

export type ResultadoImportacao = {
  // Cópia da base anterior, gravada antes de substituir os dados.
  backup: string
  tabelas: TabelaResumo[]
}
