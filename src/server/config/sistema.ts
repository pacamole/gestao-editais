import { MODELO, OLLAMA_URL_PADRAO } from '../chat/ollama.js'
import { repositorios } from '../repositorios/index.js'
import type { ConfigSmtp } from '../notificacao/transporte.js'
import type { ConfigSistema, SalvarConfigSistemaEntrada } from '../../shared/tipos/configSistema.js'

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

// Visão para a tela de configurações; a senha do SMTP não é exposta.
export function lerConfigSistema(): ConfigSistema {
  return {
    ollama_url: texto(CHAVES_CONFIG.ollamaUrl),
    ollama_url_padrao: OLLAMA_URL_PADRAO,
    ollama_modelo: MODELO,
    smtp_host: texto(CHAVES_CONFIG.smtpHost),
    smtp_porta: repositorios.config.obterNumero(CHAVES_CONFIG.smtpPorta, SMTP_PORTA_PADRAO),
    smtp_usuario: texto(CHAVES_CONFIG.smtpUsuario),
    smtp_senha_definida: Boolean(repositorios.config.obter(CHAVES_CONFIG.smtpSenha)),
    smtp_remetente: texto(CHAVES_CONFIG.smtpRemetente),
  }
}

export class ErroConfigSistema extends Error {}

export function urlHttpValida(valor: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(valor).protocol)
  } catch {
    return false
  }
}

// Valida o resultado final (atual + alterações) antes de gravar qualquer chave.
export function salvarConfigSistema(entrada: SalvarConfigSistemaEntrada): ConfigSistema {
  const atual = lerConfigSistema()
  const limpar = (valor: unknown, padrao: string) => (typeof valor === 'string' ? valor.trim() : padrao)

  const urlOllama = limpar(entrada.ollama_url, atual.ollama_url).replace(/\/+$/, '')
  const host = limpar(entrada.smtp_host, atual.smtp_host)
  const porta = entrada.smtp_porta === undefined ? atual.smtp_porta : Number(entrada.smtp_porta)
  const usuario = limpar(entrada.smtp_usuario, atual.smtp_usuario)
  const senhaNova = typeof entrada.smtp_senha === 'string' && entrada.smtp_senha ? entrada.smtp_senha : null
  const remetente = limpar(entrada.smtp_remetente, atual.smtp_remetente)

  if (urlOllama && !urlHttpValida(urlOllama)) throw new ErroConfigSistema('URL do Ollama inválida: use http:// ou https://.')
  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) throw new ErroConfigSistema('Porta SMTP inválida (1 a 65535).')
  if (host && !usuario) throw new ErroConfigSistema('Informe o usuário do SMTP.')
  if (host && !senhaNova && !atual.smtp_senha_definida) throw new ErroConfigSistema('Informe a senha do SMTP.')

  const { config } = repositorios
  config.definir(CHAVES_CONFIG.ollamaUrl, urlOllama)
  config.definir(CHAVES_CONFIG.smtpHost, host)
  config.definir(CHAVES_CONFIG.smtpPorta, String(porta))
  config.definir(CHAVES_CONFIG.smtpUsuario, usuario)
  if (senhaNova) config.definir(CHAVES_CONFIG.smtpSenha, senhaNova)
  config.definir(CHAVES_CONFIG.smtpRemetente, remetente)
  return lerConfigSistema()
}
