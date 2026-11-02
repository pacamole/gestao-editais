import { emailValido } from '../../shared/catalogoAlertas.js'
import { NOME_REMETENTE_PADRAO } from '../../shared/provedoresEmail.js'
import type {
  ConfigSistema,
  ConfigSistemaResposta,
  ModoOllama,
  SalvarConfigSistemaEntrada,
  TestarEmailResposta,
  TestarOllamaEntrada,
  TestarOllamaResposta,
} from '../../shared/tipos/configSistema.js'
import { diagnosticarOllama } from '../adaptadores/ollama/diagnostico.js'
import { MODELO, OLLAMA_CLOUD_URL, OLLAMA_URL_PADRAO, type ConexaoOllama } from '../adaptadores/ollama/conexao.js'
import { ErroServicoExterno, ErroValidacao } from '../dominio/erros.js'
import { TERMOS_EXCLUDENTES_PADRAO } from '../dominio/relevancia.js'
import type { ConfigSmtp, EmailPorta } from '../portas/EmailPorta.js'
import type { Repositorios } from '../repositorios/index.js'

type RepositoriosConfig = Pick<Repositorios, 'config'>

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
  termosExcludentes: 'termos_excludentes',
  diasExpirarSemPrazo: 'dias_expirar_sem_prazo',
} as const

const SMTP_PORTA_PADRAO = 465
export const CHAT_LIMITE_DIARIO_PADRAO = 20
const CHAT_LIMITE_MAXIMO = 500
export const DIAS_EXPIRAR_SEM_PRAZO_PADRAO = 60
const DIAS_EXPIRAR_MAXIMO = 3650

export function urlHttpValida(valor: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(valor).protocol)
  } catch {
    return false
  }
}

const listaDeTermos = (texto: string): string[] => [
  ...new Set(texto.split(/\r?\n|,/).map((t) => t.trim()).filter(Boolean)),
]

// Configurações do sistema: IA (Ollama), e-mail (SMTP) e limite do chat.
export class ConfigSistemaServico {
  constructor(
    private readonly repos: RepositoriosConfig,
    private readonly criarEmailSmtp: (config: ConfigSmtp) => EmailPorta,
  ) {}

  // ---- Leitura (usada pelos adaptadores e pelos outros services) ----

  /** Onde chamar o Ollama: local (endereço configurável, gemma2) ou Ollama Cloud (chave + modelo escolhido). */
  conexaoOllama(): ConexaoOllama {
    if (this.modoOllama() === 'NUVEM') {
      return {
        url: OLLAMA_CLOUD_URL,
        chave: this.texto(CHAVES_CONFIG.ollamaChave) || null,
        modelo: this.texto(CHAVES_CONFIG.ollamaModeloNuvem),
      }
    }
    return { url: this.texto(CHAVES_CONFIG.ollamaUrl) || OLLAMA_URL_PADRAO, chave: null, modelo: MODELO }
  }

  chatLimiteDiario(): number {
    return this.repos.config.obterNumero(CHAVES_CONFIG.chatLimiteDiario, CHAT_LIMITE_DIARIO_PADRAO)
  }

  /** Termos que tiram da análise o edital coletado sozinho (um por linha na configuração; sem nada salvo, a lista padrão). */
  termosExcludentes(): string[] {
    const salvo = this.repos.config.obter(CHAVES_CONFIG.termosExcludentes)
    return salvo === undefined ? [...TERMOS_EXCLUDENTES_PADRAO] : listaDeTermos(salvo)
  }

  /** Dias sem atualização depois dos quais um edital sem prazo definido expira. */
  diasExpirarSemPrazo(): number {
    return this.repos.config.obterNumero(CHAVES_CONFIG.diasExpirarSemPrazo, DIAS_EXPIRAR_SEM_PRAZO_PADRAO)
  }

  /** null = SMTP não configurado (e-mails só são impressos no terminal). */
  configSmtp(): ConfigSmtp | null {
    const host = this.texto(CHAVES_CONFIG.smtpHost)
    if (!host) return null
    const usuario = this.texto(CHAVES_CONFIG.smtpUsuario)
    const senha = this.repos.config.obter(CHAVES_CONFIG.smtpSenha) ?? ''
    if (!usuario || !senha) throw new Error('SMTP configurado sem usuário ou senha.')
    return {
      host,
      porta: this.repos.config.obterNumero(CHAVES_CONFIG.smtpPorta, SMTP_PORTA_PADRAO),
      usuario,
      senha,
      remetente: `${this.texto(CHAVES_CONFIG.smtpNomeRemetente) || NOME_REMETENTE_PADRAO} <${usuario}>`,
    }
  }

  // ---- Casos de uso ----

  /** Visão para a tela de configurações; a senha do SMTP e a chave do Ollama não são expostas. */
  obter(): ConfigSistemaResposta {
    return { config: this.ler() }
  }

  /** Valida o resultado final (atual + alterações) antes de gravar qualquer chave. */
  salvar(corpo: unknown): ConfigSistemaResposta {
    const entrada = (corpo ?? {}) as SalvarConfigSistemaEntrada
    const atual = this.ler()
    const limpar = (valor: unknown, padrao: string) => (typeof valor === 'string' ? valor.trim() : padrao)

    const modo: ModoOllama = entrada.ollama_modo === undefined ? atual.ollama_modo : entrada.ollama_modo === 'NUVEM' ? 'NUVEM' : 'LOCAL'
    const urlOllama = limpar(entrada.ollama_url, atual.ollama_url).replace(/\/+$/, '')
    const modeloNuvem = limpar(entrada.ollama_modelo_nuvem, atual.ollama_modelo_nuvem)
    const chaveNova = typeof entrada.ollama_chave === 'string' && entrada.ollama_chave.trim() ? entrada.ollama_chave.trim() : null
    const limiteChat = entrada.chat_limite_diario === undefined ? atual.chat_limite_diario : Number(entrada.chat_limite_diario)
    const termos = Array.isArray(entrada.termos_excludentes)
      ? listaDeTermos(entrada.termos_excludentes.map(String).join('\n'))
      : atual.termos_excludentes
    const diasExpirar =
      entrada.dias_expirar_sem_prazo === undefined ? atual.dias_expirar_sem_prazo : Number(entrada.dias_expirar_sem_prazo)
    const host = limpar(entrada.smtp_host, atual.smtp_host)
    const porta = entrada.smtp_porta === undefined ? atual.smtp_porta : Number(entrada.smtp_porta)
    const usuario = limpar(entrada.smtp_usuario, atual.smtp_usuario)
    const senhaNova = typeof entrada.smtp_senha === 'string' && entrada.smtp_senha ? entrada.smtp_senha : null
    // Sem < > nem aspas: o nome entra no cabeçalho "De:".
    const nomeRemetente = limpar(entrada.smtp_nome_remetente, atual.smtp_nome_remetente).replace(/[<>"]/g, '')

    if (urlOllama && !urlHttpValida(urlOllama)) throw new ErroValidacao('Endereço do Ollama inválido: use http:// ou https://.')
    if (modo === 'NUVEM') {
      const comChave = chaveNova || (atual.ollama_chave_definida && !entrada.remover_ollama_chave)
      if (!comChave) throw new ErroValidacao('Informe a chave de API do Ollama Cloud.')
      if (!modeloNuvem) throw new ErroValidacao('Escolha o modelo do Ollama Cloud.')
    }
    if (!Number.isInteger(limiteChat) || limiteChat < 1 || limiteChat > CHAT_LIMITE_MAXIMO) {
      throw new ErroValidacao(`Perguntas por dia: informe um número inteiro de 1 a ${CHAT_LIMITE_MAXIMO}.`)
    }
    if (!Number.isInteger(diasExpirar) || diasExpirar < 1 || diasExpirar > DIAS_EXPIRAR_MAXIMO) {
      throw new ErroValidacao(`Dias para expirar edital sem prazo: informe um número inteiro de 1 a ${DIAS_EXPIRAR_MAXIMO}.`)
    }
    if (!Number.isInteger(porta) || porta < 1 || porta > 65535) throw new ErroValidacao('Porta SMTP inválida (1 a 65535).')
    if (host && !emailValido(usuario)) throw new ErroValidacao('Informe o e-mail da conta que envia os alertas.')
    if (host && !senhaNova && !atual.smtp_senha_definida) throw new ErroValidacao('Informe a senha de app da conta.')

    const { config } = this.repos
    config.definir(CHAVES_CONFIG.ollamaModo, modo)
    config.definir(CHAVES_CONFIG.ollamaUrl, urlOllama)
    config.definir(CHAVES_CONFIG.ollamaModeloNuvem, modeloNuvem)
    if (entrada.remover_ollama_chave) config.definir(CHAVES_CONFIG.ollamaChave, '')
    else if (chaveNova) config.definir(CHAVES_CONFIG.ollamaChave, chaveNova)
    config.definir(CHAVES_CONFIG.chatLimiteDiario, String(limiteChat))
    config.definir(CHAVES_CONFIG.termosExcludentes, termos.join('\n'))
    config.definir(CHAVES_CONFIG.diasExpirarSemPrazo, String(diasExpirar))
    config.definir(CHAVES_CONFIG.smtpHost, host)
    config.definir(CHAVES_CONFIG.smtpPorta, String(porta))
    config.definir(CHAVES_CONFIG.smtpUsuario, usuario)
    if (senhaNova) config.definir(CHAVES_CONFIG.smtpSenha, senhaNova)
    config.definir(CHAVES_CONFIG.smtpNomeRemetente, nomeRemetente)
    return this.obter()
  }

  /** Envia um e-mail de teste com o SMTP salvo (sem cair no terminal). */
  async testarEmail(para: unknown): Promise<TestarEmailResposta> {
    const destino = String(para ?? '').trim()
    if (!/^[^\s@]+@[^\s@]+$/.test(destino)) throw new ErroValidacao('Informe um e-mail de destino válido.')

    let config: ConfigSmtp | null
    try {
      config = this.configSmtp()
    } catch (erro) {
      throw new ErroValidacao((erro as Error).message)
    }
    if (!config) throw new ErroValidacao('SMTP não configurado: salve o servidor antes de testar.')

    try {
      await this.criarEmailSmtp(config).enviar({
        para: destino,
        assunto: 'Teste de e-mail — Editais I9+',
        texto: 'Se você recebeu esta mensagem, o SMTP do Gestor de Editais está funcionando.',
      })
    } catch (erro) {
      throw new ErroServicoExterno(`Falha ao enviar: ${(erro as Error).message}`)
    }
    return { ok: true }
  }

  /**
   * Confere se o Ollama responde, se aceita a chave e se o modelo está disponível.
   * Responde com a situação; só um endereço inválido é erro.
   */
  async testarOllama(corpo: unknown): Promise<TestarOllamaResposta> {
    const { modo, conexao } = this.conexaoParaTeste((corpo ?? {}) as TestarOllamaEntrada)
    if (!urlHttpValida(conexao.url)) throw new ErroValidacao('Endereço do Ollama inválido: use http:// ou https://.')

    const { situacao, modelos } = await diagnosticarOllama(modo, conexao)
    return { situacao, modo, url: conexao.url, modelo: conexao.modelo, modelos }
  }

  /** null se a IA configurada responde e tem o modelo; senão, o motivo em linguagem de usuário. */
  async problemaDaIa(): Promise<string | null> {
    const { situacao, modo } = await this.testarOllama({})
    const motivos: Record<string, string> = {
      SEM_CHAVE: 'falta a chave do Ollama Cloud em Configurações › IA.',
      ACESSO_NEGADO: 'a chave do Ollama Cloud foi recusada; confira em Configurações › IA.',
      SEM_MODELO: 'o modelo escolhido não está disponível; confira em Configurações › IA.',
      SEM_CONEXAO: modo === 'LOCAL' ? 'o Ollama local não está respondendo (ele está aberto?).' : 'o Ollama Cloud não está respondendo.',
    }
    return situacao === 'OK' ? null : (motivos[situacao] ?? 'a IA não está respondendo.')
  }

  // ---- Internos ----

  private texto(chave: string): string {
    return this.repos.config.obter(chave)?.trim() ?? ''
  }

  private modoOllama(): ModoOllama {
    return this.texto(CHAVES_CONFIG.ollamaModo) === 'NUVEM' ? 'NUVEM' : 'LOCAL'
  }

  // Conexão para o botão de teste: o que foi digitado na tela, completado pelo que está salvo.
  private conexaoParaTeste(entrada: TestarOllamaEntrada): { modo: ModoOllama; conexao: ConexaoOllama } {
    const modo: ModoOllama = entrada.modo === 'NUVEM' || entrada.modo === 'LOCAL' ? entrada.modo : this.modoOllama()
    if (modo === 'NUVEM') {
      const chave = (typeof entrada.chave === 'string' && entrada.chave.trim()) || this.texto(CHAVES_CONFIG.ollamaChave)
      const modelo = (typeof entrada.modelo === 'string' && entrada.modelo.trim()) || this.texto(CHAVES_CONFIG.ollamaModeloNuvem)
      return { modo, conexao: { url: OLLAMA_CLOUD_URL, chave: chave || null, modelo } }
    }
    const digitada = typeof entrada.url === 'string' ? entrada.url.trim().replace(/\/+$/, '') : ''
    return { modo, conexao: { url: digitada || this.texto(CHAVES_CONFIG.ollamaUrl) || OLLAMA_URL_PADRAO, chave: null, modelo: MODELO } }
  }

  private ler(): ConfigSistema {
    return {
      ollama_modo: this.modoOllama(),
      ollama_url: this.texto(CHAVES_CONFIG.ollamaUrl),
      ollama_cloud_url: OLLAMA_CLOUD_URL,
      ollama_modelo_nuvem: this.texto(CHAVES_CONFIG.ollamaModeloNuvem),
      ollama_chave_definida: Boolean(this.texto(CHAVES_CONFIG.ollamaChave)),
      ollama_url_padrao: OLLAMA_URL_PADRAO,
      ollama_modelo: MODELO,
      smtp_host: this.texto(CHAVES_CONFIG.smtpHost),
      smtp_porta: this.repos.config.obterNumero(CHAVES_CONFIG.smtpPorta, SMTP_PORTA_PADRAO),
      smtp_usuario: this.texto(CHAVES_CONFIG.smtpUsuario),
      smtp_senha_definida: Boolean(this.repos.config.obter(CHAVES_CONFIG.smtpSenha)),
      smtp_nome_remetente: this.texto(CHAVES_CONFIG.smtpNomeRemetente),
      chat_limite_diario: this.chatLimiteDiario(),
      termos_excludentes: this.termosExcludentes(),
      dias_expirar_sem_prazo: this.diasExpirarSemPrazo(),
    }
  }
}
