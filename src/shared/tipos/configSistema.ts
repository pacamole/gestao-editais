// Contratos da API de configurações do sistema (/api/config/sistema).

// A senha do SMTP nunca sai do servidor: só se ela está definida.
export type ConfigSistema = {
  ollama_url: string // '' = usa o padrão
  ollama_url_padrao: string
  ollama_modelo: string
  smtp_host: string // '' = SMTP desligado (e-mails só no terminal)
  smtp_porta: number
  smtp_usuario: string // e-mail da conta que envia os alertas
  smtp_senha_definida: boolean // senha de app
  smtp_nome_remetente: string // nome exibido no "De:"; '' = padrão
}

// smtp_senha ausente ou vazia mantém a senha atual.
export type SalvarConfigSistemaEntrada = {
  ollama_url?: string
  smtp_host?: string
  smtp_porta?: number
  smtp_usuario?: string
  smtp_senha?: string
  smtp_nome_remetente?: string
}

export type ConfigSistemaResposta = { config: ConfigSistema }

export type TestarEmailEntrada = { para: string }
export type TestarEmailResposta = { ok: true }

// url ausente testa a URL salva.
export type TestarOllamaEntrada = { url?: string }
export type TestarOllamaResposta = {
  url: string
  modelos: string[]
  modelo_disponivel: boolean
}
