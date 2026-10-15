import { MODELO, OLLAMA_CLOUD_URL, OLLAMA_URL_PADRAO, type ConexaoOllama } from '../chat/ollama.js'
import { repositorios } from '../repositorios/index.js'
import type { ConfigSmtp } from '../notificacao/transporte.js'
import { emailValido } from '../../shared/catalogoAlertas.js'
import { NOME_REMETENTE_PADRAO } from '../../shared/provedoresEmail.js'
import type {
  ConfigSistema,
  ModoOllama,
  SalvarConfigSistemaEntrada,
  TestarOllamaEntrada,
} from '../../shared/tipos/configSistema.js'

// Configurações do sistema guardadas na tabela `config`, editáveis a qualquer momento.
// Lidas a cada uso: uma mudança vale sem reiniciar o servidor.

export const CHAVES_CONFIG = {
  ollamaModo: 'ollama_modo',
  ollamaUrl: 'ollama_url',
  ollamaModeloNuvem: 'ollama_modelo_nuvem',
  ollamaChave: 'ollama_chave',
  chatLimiteDiario: 'chat_limite_diario',
  smtpHost: 'smtp_host',
  smtpPorta: 'smtp_porta',
  smtpUsuario: 'smtp_usuario',
  smtpSenha: 'smtp_senha',
  smtpNomeRemetente: 'smtp_nome_remetente',
} as const

const SMTP_PORTA_PADRAO = 465
export const CHAT_LIMITE_DIARIO_PADRAO = 20
const CHAT_LIMITE_MAXIMO = 500

function texto(chave: string): string {
  return repositorios.config.obter(chave)?.trim() ?? ''
}

function modoOllama(): ModoOllama {
  return texto(CHAVES_CONFIG.ollamaModo) === 'NUVEM' ? 'NUVEM' : 'LOCAL'
}

// Onde chamar o Ollama: local (endereço configurável, gemma2) ou Ollama Cloud (chave + modelo escolhido).
export function conexaoOllama(): ConexaoOllama {
  if (modoOllama() === 'NUVEM') {
    return { url: OLLAMA_CLOUD_URL, chave: texto(CHAVES_CONFIG.ollamaChave) || null, modelo: texto(CHAVES_CONFIG.ollamaModeloNuvem) }
  }
  return { url: texto(CHAVES_CONFIG.ollamaUrl) || OLLAMA_URL_PADRAO, chave: null, modelo: MODELO }
}

// Conexão para o botão de teste: o que foi digitado na tela, completado pelo que está salvo.
export function conexaoOllamaParaTeste(entrada: TestarOllamaEntrada): { modo: ModoOllama; conexao: ConexaoOllama } {
  const modo: ModoOllama = entrada.modo === 'NUVEM' || entrada.modo === 'LOCAL' ? entrada.modo : modoOllama()
  if (modo === 'NUVEM') {
    const chave = (typeof entrada.chave === 'string' && entrada.chave.trim()) || texto(CHAVES_CONFIG.ollamaChave)
    const modelo = (typeof entrada.modelo === 'string' && entrada.modelo.trim()) || texto(CHAVES_CONFIG.ollamaModeloNuvem)
    return { modo, conexao: { url: OLLAMA_CLOUD_URL, chave: chave || null, modelo } }
  }
  const digitada = typeof entrada.url === 'string' ? entrada.url.trim().replace(/\/+$/, '') : ''
  return { modo, conexao: { url: digitada || texto(CHAVES_CONFIG.ollamaUrl) || OLLAMA_URL_PADRAO, chave: null, modelo: MODELO } }
}

export function chatLimiteDiario(): number {
  return repositorios.config.obterNumero(CHAVES_CONFIG.chatLimiteDiario, CHAT_LIMITE_DIARIO_PADRAO)
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
    remetente: `${texto(CHAVES_CONFIG.smtpNomeRemetente) || NOME_REMETENTE_PADRAO} <${usuario}>`,
  }
}

// Visão para a tela de configurações; a senha do SMTP não é exposta.
export function lerConfigSistema(): ConfigSistema {
  return {
    ollama_modo: modoOllama(),
    ollama_url: texto(CHAVES_CONFIG.ollamaUrl),
    ollama_cloud_url: OLLAMA_CLOUD_URL,
    ollama_modelo_nuvem: texto(CHAVES_CONFIG.ollamaModeloNuvem),
    ollama_chave_definida: Boolean(texto(CHAVES_CONFIG.ollamaChave)),
    ollama_url_padrao: OLLAMA_URL_PADRAO,
    ollama_modelo: MODELO,
    smtp_host: texto(CHAVES_CONFIG.smtpHost),
    smtp_porta: repositorios.config.obterNumero(CHAVES_CONFIG.smtpPorta, SMTP_PORTA_PADRAO),
    smtp_usuario: texto(CHAVES_CONFIG.smtpUsuario),
    smtp_senha_definida: Boolean(repositorios.config.obter(CHAVES_CONFIG.smtpSenha)),
    smtp_nome_remetente: texto(CHAVES_CONFIG.smtpNomeRemetente),
    chat_limite_diario: chatLimiteDiario(),
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

  const modo: ModoOllama = entrada.ollama_modo === undefined ? atual.ollama_modo : entrada.ollama_modo === 'NUVEM' ? 'NUVEM' : 'LOCAL'
  const urlOllama = limpar(entrada.ollama_url, atual.ollama_url).replace(/\/+$/, '')
  const modeloNuvem = limpar(entrada.ollama_modelo_nuvem, atual.ollama_modelo_nuvem)
  const chaveNova = typeof entrada.ollama_chave === 'string' && entrada.ollama_chave.trim() ? entrada.ollama_chave.trim() : null
  const limiteChat = entrada.chat_limite_diario === undefined ? atual.chat_limite_diario : Number(entrada.chat_limite_diario)
  const host = limpar(entrada.smtp_host, atual.smtp_host)
  const porta = entrada.smtp_porta === undefined ? atual.smtp_porta : Number(entrada.smtp_porta)
  const usuario = limpar(entrada.smtp_usuario, atual.smtp_usuario)
  const senhaNova = typeof entrada.smtp_senha === 'string' && entrada.smtp_senha ? entrada.smtp_senha : null
  // Sem < > nem aspas: o nome entra no cabeçalho "De:".
  const nomeRemetente = limpar(entrada.smtp_nome_remetente, atual.smtp_nome_remetente).replace(/[<>"]/g, '')

  if (urlOllama && !urlHttpValida(urlOllama)) throw new ErroConfigSistema('Endereço do Ollama inválido: use http:// ou https://.')
  if (modo === 'NUVEM') {
    const comChave = chaveNova || (atual.ollama_chave_definida && !entrada.remover_ollama_chave)
    if (!comChave) throw new ErroConfigSistema('Informe a chave de API do Ollama Cloud.')
    if (!modeloNuvem) throw new ErroConfigSistema('Escolha o modelo do Ollama Cloud.')
  }
  if (!Number.isInteger(limiteChat) || limiteChat < 1 || limiteChat > CHAT_LIMITE_MAXIMO) {
    throw new ErroConfigSistema(`Perguntas por dia: informe um número inteiro de 1 a ${CHAT_LIMITE_MAXIMO}.`)
  }
  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) throw new ErroConfigSistema('Porta SMTP inválida (1 a 65535).')
  if (host && !emailValido(usuario)) throw new ErroConfigSistema('Informe o e-mail da conta que envia os alertas.')
  if (host && !senhaNova && !atual.smtp_senha_definida) throw new ErroConfigSistema('Informe a senha de app da conta.')

  const { config } = repositorios
  config.definir(CHAVES_CONFIG.ollamaModo, modo)
  config.definir(CHAVES_CONFIG.ollamaUrl, urlOllama)
  config.definir(CHAVES_CONFIG.ollamaModeloNuvem, modeloNuvem)
  if (entrada.remover_ollama_chave) config.definir(CHAVES_CONFIG.ollamaChave, '')
  else if (chaveNova) config.definir(CHAVES_CONFIG.ollamaChave, chaveNova)
  config.definir(CHAVES_CONFIG.chatLimiteDiario, String(limiteChat))
  config.definir(CHAVES_CONFIG.smtpHost, host)
  config.definir(CHAVES_CONFIG.smtpPorta, String(porta))
  config.definir(CHAVES_CONFIG.smtpUsuario, usuario)
  if (senhaNova) config.definir(CHAVES_CONFIG.smtpSenha, senhaNova)
  config.definir(CHAVES_CONFIG.smtpNomeRemetente, nomeRemetente)
  return lerConfigSistema()
}
