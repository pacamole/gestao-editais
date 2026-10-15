import { OLLAMA_URL_PADRAO } from '../chat/ollama.js'
import { repositorios } from '../repositorios/index.js'
import type { ConfigSmtp } from '../notificacao/transporte.js'

// Configurações do sistema guardadas na tabela `config`, editáveis a qualquer momento.
// Lidas a cada uso: uma mudança vale sem reiniciar o servidor.

export const CHAVES_CONFIG = {
  ollamaUrl: 'ollama_url',
  smtpHost: 'smtp_host',
  smtpPorta: 'smtp_porta',
  smtpUsuario: 'smtp_usuario',
  smtpSenha: 'smtp_senha',
  smtpRemetente: 'smtp_remetente',
} as const

const SMTP_PORTA_PADRAO = 465

function texto(chave: string): string {
  return repositorios.config.obter(chave)?.trim() ?? ''
}

export function ollamaUrl(): string {
  return texto(CHAVES_CONFIG.ollamaUrl) || OLLAMA_URL_PADRAO
}

// null = SMTP não configurado (e-mails só são impressos no terminal).
export function configSmtp(): ConfigSmtp | null {
  const host = texto(CHAVES_CONFIG.smtpHost)
  if (!host) return null
  const usuario = texto(CHAVES_CONFIG.smtpUsuario)
  const senha = repositorios.config.obter(CHAVES_CONFIG.smtpSenha) ?? ''
  if (!usuario || !senha) throw new Error('SMTP configurado sem usuário ou senha.')
  return {
    host,
    porta: repositorios.config.obterNumero(CHAVES_CONFIG.smtpPorta, SMTP_PORTA_PADRAO),
    usuario,
    senha,
    remetente: texto(CHAVES_CONFIG.smtpRemetente) || `Editais I9+ <${usuario}>`,
  }
}

