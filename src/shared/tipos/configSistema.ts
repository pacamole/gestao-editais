// Contratos da API de configurações do sistema (/api/config/sistema).

// A senha do SMTP nunca sai do servidor: só se ela está definida.
export type ModoOllama = 'LOCAL' | 'NUVEM'

export type ConfigSistema = {
  ollama_modo: ModoOllama
  ollama_url: string // modo LOCAL; '' = usa o padrão
  ollama_cloud_url: string // modo NUVEM: endereço fixo do Ollama Cloud
  ollama_modelo_nuvem: string // modo NUVEM: modelo escolhido; '' = nenhum ainda
  ollama_chave_definida: boolean // chave de API do Ollama Cloud
  ollama_url_padrao: string
  ollama_modelo: string
  smtp_host: string // '' = SMTP desligado (e-mails só no terminal)
  smtp_porta: number
  smtp_usuario: string // e-mail da conta que envia os alertas
  smtp_senha_definida: boolean // senha de app
  smtp_nome_remetente: string // nome exibido no "De:"; '' = padrão
  chat_limite_diario: number // perguntas por usuário por dia
}

// smtp_senha ausente ou vazia mantém a senha atual.
// ollama_chave ausente ou vazia mantém a atual; remover_ollama_chave apaga.
export type SalvarConfigSistemaEntrada = {
  ollama_modo?: ModoOllama
  ollama_url?: string
  ollama_modelo_nuvem?: string
  ollama_chave?: string
  remover_ollama_chave?: boolean
  smtp_host?: string
  smtp_porta?: number
  smtp_usuario?: string
  smtp_senha?: string
  smtp_nome_remetente?: string
  chat_limite_diario?: number
}

export type ConfigSistemaResposta = { config: ConfigSistema }

export type TestarEmailEntrada = { para: string }
export type TestarEmailResposta = { ok: true }

// Campos ausentes usam o que está salvo (permite testar antes de salvar).
export type TestarOllamaEntrada = { modo?: ModoOllama; url?: string; chave?: string; modelo?: string }
// Responde sempre 200 com a situação, para a tela saber qual passo falta.
export type SituacaoOllama = 'OK' | 'SEM_MODELO' | 'SEM_CONEXAO' | 'ACESSO_NEGADO' | 'SEM_CHAVE'
export type TestarOllamaResposta = {
  situacao: SituacaoOllama
  modo: ModoOllama
  url: string
  modelo: string // o que foi testado
  modelos: string[] // disponíveis no servidor (vazio sem conexão)
}
