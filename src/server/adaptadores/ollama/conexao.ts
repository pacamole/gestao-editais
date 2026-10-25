// Onde está o Ollama e qual modelo usar (tabela `config`, tela Configurações › IA):
// local, com o gemma2 fixo, ou Ollama Cloud, com chave de API e modelo escolhido.
export const OLLAMA_URL_PADRAO = 'http://localhost:11434'
export const MODELO = 'gemma2:latest' // modelo do modo local
// API direta do Ollama Cloud; a chave vem da conta em ollama.com/settings/keys.
export const OLLAMA_CLOUD_URL = 'https://ollama.com'

export type ConexaoOllama = { url: string; chave: string | null; modelo: string }

// Mantém o caminho do endereço (ex.: http://servidor/ollama + /api/chat).
export function enderecoOllama(conexao: ConexaoOllama, caminho: string): string {
  return `${conexao.url.replace(/\/+$/, '')}${caminho}`
}

export function cabecalhosOllama(conexao: ConexaoOllama): Record<string, string> {
  return conexao.chave ? { Authorization: `Bearer ${conexao.chave}` } : {}
}
