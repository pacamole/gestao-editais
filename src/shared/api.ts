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

// ---- Onde ficam os dados: neste computador ou na nuvem (Turso) ----

export type ModoBase = 'LOCAL' | 'NUVEM'

export type ConexaoBase = {
  modo: ModoBase
  url: string // base na nuvem (vazio no modo local)
  // A nuvem estava configurada mas não abriu: o sistema seguiu com a base deste computador.
  erroNuvem: string | null
}

// Resultado de testar uma base na nuvem antes de conectar.
export type SituacaoNuvem = 'VAZIA' | 'COM_DADOS' | 'SCHEMA_DIFERENTE' | 'SEM_CONEXAO' | 'TOKEN_RECUSADO'
export type TesteNuvemEntrada = { url: string; token: string }
export type TesteNuvemResposta = {
  situacao: SituacaoNuvem
  tabelas?: TabelaResumo[] // COM_DADOS
  diferencas?: string[] // SCHEMA_DIFERENTE
  mensagem?: string // SEM_CONEXAO: detalhe do erro
}
// enviarDadosLocais só vale para base vazia na nuvem.
export type ConectarNuvemEntrada = TesteNuvemEntrada & { enviarDadosLocais: boolean }
// Depois de trocar a base, a sessão atual deixa de existir: é preciso entrar de novo.
export type TrocaBaseResposta = { ok: true; conexao: ConexaoBase }

// Base em uso agora (tela Configurações › Base de dados).
export type ResumoBase = {
  arquivo: string
  tamanhoBytes: number
  tabelas: TabelaResumo[]
}

export type ResumoBaseResposta = ResumoBase & { conexao: ConexaoBase }

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
