import { randomUUID } from 'node:crypto'
import { emailValido } from '../../shared/catalogoAlertas.js'
import { NOME_REMETENTE_PADRAO } from '../../shared/provedoresEmail.js'
import type {
  ConexaoIaApi,
  ConfigSistema,
  ConfigSistemaResposta,
  ListarModelosIaEntrada,
  ListarModelosIaResposta,
  ModoOllama,
  SalvarConexaoIaEntrada,
  SalvarConexaoIaResposta,
  SalvarConfigSistemaEntrada,
  TestarEmailResposta,
  TestarOllamaEntrada,
  TestarOllamaResposta,
} from '../../shared/tipos/configSistema.js'
import { diagnosticarOllama } from '../adaptadores/ollama/diagnostico.js'
import { MODELO, OLLAMA_CLOUD_URL, OLLAMA_URL_PADRAO, type ConexaoOllama } from '../adaptadores/ollama/conexao.js'
import { ErroServicoExterno, ErroValidacao } from '../dominio/erros.js'
import { TERMOS_EXCLUDENTES_PADRAO } from '../dominio/relevancia.js'
import { cifrarSegredo, decifrarSegredo } from '../util/segredo.js'
import { urlApiValida, validarDestinoApi } from '../util/urlApiSegura.js'
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
  iaApiConexoes: 'ia_api_conexoes',
  iaApiSelecionada: 'ia_api_selecionada',
  iaApiModelo: 'ia_api_modelo',
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

type ConexaoIaArmazenada = ConexaoIaApi & { chaveCifrada: string }

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
        chave: this.chaveOllama() || null,
        modelo: this.texto(CHAVES_CONFIG.ollamaModeloNuvem),
      }
    }
    return { url: this.texto(CHAVES_CONFIG.ollamaUrl) || OLLAMA_URL_PADRAO, chave: null, modelo: MODELO }
  }

  usaConexaoIaApi(): boolean {
    return this.modoOllama() === 'NUVEM' && Boolean(this.conexaoApiSelecionada())
  }

  conexaoIaApi(): { url: string; chave: string; modelo: string } {
    const id = this.texto(CHAVES_CONFIG.iaApiSelecionada)
    const conexao = this.conexoesIaArmazenadas().find((c) => c.id === id)
    if (!conexao) throw new ErroValidacao('Selecione uma conexão de IA por API em Configurações › Inteligência artificial.')
    return {
      url: conexao.url,
      chave: decifrarSegredo(conexao.chaveCifrada),
      modelo: this.texto(CHAVES_CONFIG.iaApiModelo),
    }
  }

  async salvarConexaoIa(corpo: unknown): Promise<SalvarConexaoIaResposta> {
    const entrada = (corpo ?? {}) as SalvarConexaoIaEntrada
    const nome = typeof entrada.nome === 'string' ? entrada.nome.trim() : ''
    const url = typeof entrada.url === 'string' ? entrada.url.trim().replace(/\/+$/, '') : ''
    const chave = typeof entrada.chave === 'string' ? entrada.chave.trim() : ''
    const modelo = typeof entrada.modelo === 'string' ? entrada.modelo.trim() : ''
    if (!nome || nome.length > 80) throw new ErroValidacao('Informe um nome de até 80 caracteres para a conexão.')
    if (!urlApiValida(url)) throw new ErroValidacao('URL inválida. Use a URL HTTPS base de uma API compatível com OpenAI.')
    if (!modelo) throw new ErroValidacao('Escolha um modelo antes de salvar a conexão.')

    const conexoes = this.conexoesIaArmazenadas()
    const existente = entrada.id ? conexoes.find((c) => c.id === entrada.id) : undefined
    if (entrada.id && !existente) throw new ErroValidacao('A conexão selecionada não existe mais. Atualize a página.')
    if (!existente && !chave) throw new ErroValidacao('Informe a chave de API para cadastrar a conexão.')
    const chaveCifrada = chave ? cifrarSegredo(chave) : existente?.chaveCifrada
    if (!chaveCifrada) throw new ErroValidacao('Informe a chave de API para cadastrar a conexão.')
    const registro: ConexaoIaArmazenada = {
      id: existente?.id ?? randomUUID(),
      nome,
      url,
      chaveCifrada,
    }
    const atualizados = existente
      ? conexoes.map((c) => (c.id === registro.id ? registro : c))
      : [...conexoes, registro]
    this.repos.config.definir(CHAVES_CONFIG.iaApiConexoes, JSON.stringify(atualizados))
    this.repos.config.definir(CHAVES_CONFIG.ollamaModo, 'NUVEM')
    this.repos.config.definir(CHAVES_CONFIG.iaApiSelecionada, registro.id)
    this.repos.config.definir(CHAVES_CONFIG.iaApiModelo, modelo)
    return { ...this.obter(), conexaoId: registro.id }
  }

  removerConexaoIa(id: string): ConfigSistemaResposta {
    const existentes = this.conexoesIaArmazenadas()
    if (!existentes.some((c) => c.id === id)) throw new ErroValidacao('A conexão selecionada não existe mais. Atualize a página.')
    const conexoes = existentes.filter((c) => c.id !== id)
    this.repos.config.definir(CHAVES_CONFIG.iaApiConexoes, JSON.stringify(conexoes))
    if (this.texto(CHAVES_CONFIG.iaApiSelecionada) === id) {
      this.repos.config.definir(CHAVES_CONFIG.iaApiSelecionada, '')
      this.repos.config.definir(CHAVES_CONFIG.iaApiModelo, '')
      if (this.modoOllama() === 'NUVEM') this.repos.config.definir(CHAVES_CONFIG.ollamaModo, 'LOCAL')
    }
    return this.obter()
  }

  async listarModelosIa(corpo: unknown): Promise<ListarModelosIaResposta> {
    const entrada = (corpo ?? {}) as ListarModelosIaEntrada
    const existente = entrada.id ? this.conexoesIaArmazenadas().find((c) => c.id === entrada.id) : undefined
    if (entrada.id && !existente) throw new ErroValidacao('A conexão selecionada não existe mais. Atualize a página.')
    const url = typeof entrada.url === 'string' && entrada.url.trim() ? entrada.url.trim().replace(/\/+$/, '') : existente?.url
    const chave = typeof entrada.chave === 'string' && entrada.chave.trim()
      ? entrada.chave.trim()
      : existente
        ? decifrarSegredo(existente.chaveCifrada)
        : ''
    if (!url || !urlApiValida(url)) throw new ErroValidacao('Informe uma URL HTTPS válida para a API compatível com OpenAI.')
    if (!chave) throw new ErroValidacao('Informe a chave de API.')
    await validarDestinoApi(url)

    let resposta: Response
    try {
      resposta = await fetch(`${url}/models`, {
        headers: { Authorization: `Bearer ${chave}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(15_000),
        redirect: 'error',
      })
    } catch (erro) {
      if (erro instanceof Error && erro.name === 'TimeoutError') {
        throw new ErroServicoExterno('A consulta de modelos excedeu o tempo limite. Confira a API e tente novamente.')
      }
      throw new ErroServicoExterno(`Não foi possível consultar os modelos da API: ${(erro as Error).message}`)
    }
    if (!resposta.ok) {
      const motivo = resposta.status === 401 || resposta.status === 403
        ? 'A chave de API foi recusada.'
        : resposta.status === 402
          ? 'O provedor exige pagamento ou a conta está sem saldo/créditos. Confira faturamento e limites.'
          : resposta.status === 429
            ? 'A conta atingiu o limite de requisições. Aguarde ou confira a cota no painel do provedor.'
        : `A API respondeu HTTP ${resposta.status}.`
      throw new ErroServicoExterno(motivo)
    }

    let dados: unknown
    try {
      dados = await resposta.json()
    } catch {
      throw new ErroServicoExterno('A API retornou uma lista de modelos em formato inválido.')
    }
    if (!dados || typeof dados !== 'object') throw new ErroServicoExterno('A API retornou uma lista de modelos em formato inválido.')
    const corpoModelos = dados as { data?: unknown; models?: unknown }
    const lista = Array.isArray(corpoModelos.data) ? corpoModelos.data : Array.isArray(corpoModelos.models) ? corpoModelos.models : []
    const modelos = lista
      .filter((modelo): modelo is { id?: unknown; name?: unknown } => Boolean(modelo) && typeof modelo === 'object')
      .map((modelo) => {
        const nome = modelo.id ?? modelo.name
        return typeof nome === 'string' ? nome.trim() : ''
      })
      .filter(Boolean)
    if (!modelos.length) throw new ErroServicoExterno('A API não retornou modelos disponíveis.')
    return { modelos: [...new Set(modelos)].sort((a, b) => a.localeCompare(b)) }
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
    const conexaoIaSelecionada = limpar(entrada.ia_api_selecionada, atual.ia_api_selecionada)
    const modeloIa = limpar(entrada.ia_api_modelo, atual.ia_api_modelo)
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
      if (conexaoIaSelecionada) {
        if (!this.conexoesIaArmazenadas().some((c) => c.id === conexaoIaSelecionada)) {
          throw new ErroValidacao('A conexão selecionada não existe. Escolha outra conexão.')
        }
        if (!modeloIa) throw new ErroValidacao('Escolha o modelo da conexão de IA.')
      } else {
        const comChave = chaveNova || (atual.ollama_chave_definida && !entrada.remover_ollama_chave)
        if (!comChave) throw new ErroValidacao('Informe uma conexão de IA por API.')
        if (!modeloNuvem) throw new ErroValidacao('Escolha o modelo da conexão de IA na nuvem.')
      }
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
    config.definir(CHAVES_CONFIG.iaApiSelecionada, conexaoIaSelecionada)
    config.definir(CHAVES_CONFIG.iaApiModelo, modeloIa)
    if (entrada.remover_ollama_chave) config.definir(CHAVES_CONFIG.ollamaChave, '')
    else if (chaveNova) config.definir(CHAVES_CONFIG.ollamaChave, cifrarSegredo(chaveNova))
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
    if (this.usaConexaoIaApi()) {
      try {
        const id = this.texto(CHAVES_CONFIG.iaApiSelecionada)
        const modelo = this.texto(CHAVES_CONFIG.iaApiModelo)
        const { modelos } = await this.listarModelosIa({ id })
        return modelos.includes(modelo) ? null : 'o modelo escolhido não está disponível; confira a conexão em Configurações › IA.'
      } catch (erro) {
        const detalhe = erro instanceof Error ? erro.message : 'falha ao consultar o provedor.'
        return `a conexão de IA por API não está respondendo: ${detalhe}`
      }
    }
    const { situacao, modo } = await this.testarOllama({})
    const motivos: Record<string, string> = {
      SEM_CHAVE: 'falta a chave da conexão de IA na nuvem em Configurações › IA.',
      ACESSO_NEGADO: 'a chave da conexão de IA na nuvem foi recusada; confira em Configurações › IA.',
      SEM_CREDITO: 'a conta do provedor está sem créditos; confira saldo e planos no painel do provedor.',
      LIMITE_USO: 'a conta do provedor atingiu o limite de uso; confira os limites no painel do provedor.',
      SEM_MODELO: 'o modelo escolhido não está disponível; confira em Configurações › IA.',
      SEM_CONEXAO: modo === 'LOCAL' ? 'o Ollama local não está respondendo (ele está aberto?).' : 'a conexão de IA na nuvem não está respondendo.',
    }
    return situacao === 'OK' ? null : (motivos[situacao] ?? 'a IA não está respondendo.')
  }

  // ---- Internos ----

  private texto(chave: string): string {
    return this.repos.config.obter(chave)?.trim() ?? ''
  }

  private chaveOllama(): string {
    const armazenada = this.texto(CHAVES_CONFIG.ollamaChave)
    if (!armazenada) return ''
    if (armazenada.startsWith('v1:')) return decifrarSegredo(armazenada)
    if (process.env.IA_CHAVE_CRIPTOGRAFIA) {
      this.repos.config.definir(CHAVES_CONFIG.ollamaChave, cifrarSegredo(armazenada))
    }
    return armazenada
  }

  private modoOllama(): ModoOllama {
    return this.texto(CHAVES_CONFIG.ollamaModo) === 'NUVEM' ? 'NUVEM' : 'LOCAL'
  }

  private conexoesIaArmazenadas(): ConexaoIaArmazenada[] {
    const salvo = this.texto(CHAVES_CONFIG.iaApiConexoes)
    if (!salvo) return []
    const dados: unknown = JSON.parse(salvo)
    if (!Array.isArray(dados)) throw new Error('A lista de conexões de IA armazenada está inválida.')
    const validas = dados.every((item) =>
      item && typeof item === 'object' &&
      typeof item.id === 'string' && typeof item.nome === 'string' &&
      typeof item.url === 'string' && typeof item.chaveCifrada === 'string',
    )
    if (!validas) throw new Error('Uma conexão de IA armazenada está inválida.')
    return dados as ConexaoIaArmazenada[]
  }

  private conexaoApiSelecionada(): ConexaoIaArmazenada | undefined {
    const id = this.texto(CHAVES_CONFIG.iaApiSelecionada)
    return this.conexoesIaArmazenadas().find((c) => c.id === id)
  }

  // Conexão para o botão de teste: o que foi digitado na tela, completado pelo que está salvo.
  private conexaoParaTeste(entrada: TestarOllamaEntrada): { modo: ModoOllama; conexao: ConexaoOllama } {
    const modo: ModoOllama = entrada.modo === 'NUVEM' || entrada.modo === 'LOCAL' ? entrada.modo : this.modoOllama()
    if (modo === 'NUVEM') {
      const chave = (typeof entrada.chave === 'string' && entrada.chave.trim()) || this.chaveOllama()
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
      ollama_chave_definida: Boolean(this.chaveOllama()),
      ollama_url_padrao: OLLAMA_URL_PADRAO,
      ollama_modelo: MODELO,
      ia_api_conexoes: this.conexoesIaArmazenadas().map(({ id, nome, url }) => ({ id, nome, url })),
      ia_api_selecionada: this.texto(CHAVES_CONFIG.iaApiSelecionada),
      ia_api_modelo: this.texto(CHAVES_CONFIG.iaApiModelo),
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
