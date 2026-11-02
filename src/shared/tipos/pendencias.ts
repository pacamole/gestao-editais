// Contratos da API de pendências (/api/pendencias): o que falta configurar para o sistema funcionar.

export type Pendencia = {
  id: 'PERFIL' | 'SMTP' | 'DESTINATARIOS'
  texto: string
  link: string
  acao: string // texto do link
}

export type PendenciasResposta = {
  pendencias: Pendencia[]
  totalEditais: number
  fontesMonitoradas: number
}
