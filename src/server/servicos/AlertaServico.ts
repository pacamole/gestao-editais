import { ErroParametroAlerta, normalizarDestinatarios } from '../../shared/catalogoAlertas.js'
import type {
  AlertasResposta,
  LogsAlertaResposta,
  SalvarAlertasResposta,
  SimularAlertaResposta,
} from '../../shared/tipos/alertas.js'
import { transacao } from '../db/index.js'
import type { ConfigAlerta, TipoNotificacao } from '../dominio/entidades.js'
import { ErroNaoEncontrado, ErroValidacao } from '../dominio/erros.js'
import type { NotificacaoServico } from './NotificacaoServico.js'
import { normalizarParametros, TIPOS_NOTIFICACAO } from '../../shared/catalogoAlertas.js'
import { notificacaoSimulada } from './notificacao/simulacao.js'
import type { Repositorios } from '../repositorios/index.js'

type RepositoriosAlerta = Pick<Repositorios, 'configAlerta' | 'notificacaoLog' | 'destinatario'>

const HISTORICO_LIMITE = 50

// Configuração dos alertas (quais, para quem, com quais parâmetros) e o envio de simulações.
export class AlertaServico {
  constructor(
    private readonly repos: RepositoriosAlerta,
    private readonly notificacoes: NotificacaoServico,
    private readonly smtpConfigurado: () => boolean,
  ) {}

  listar(): AlertasResposta {
    return {
      configuracoes: this.configuracoesAtuais(),
      logs: this.repos.notificacaoLog.recentes(HISTORICO_LIMITE),
      ultimos_envios: this.repos.notificacaoLog.ultimosEnvios(),
    }
  }

  logs(): LogsAlertaResposta {
    return { logs: this.repos.notificacaoLog.recentes(HISTORICO_LIMITE) }
  }

  salvar(itens: unknown): SalvarAlertasResposta {
    if (!Array.isArray(itens) || !itens.length) throw new ErroValidacao('Envie { configuracoes: [...] }.')

    let configs: ConfigAlerta[]
    try {
      configs = itens.map((item) => this.normalizarConfig(item))
    } catch (erro) {
      throw erro instanceof ErroParametroAlerta ? new ErroValidacao(erro.message) : erro
    }

    transacao(() => {
      for (const config of configs) {
        if (this.repos.configAlerta.buscarPorId(config.tipo)) this.repos.configAlerta.atualizar(config.tipo, config)
        else this.repos.configAlerta.inserir(config)
      }
    })
    return { ok: true, configuracoes: this.configuracoesAtuais() }
  }

  /** Envia agora um e-mail do tipo, com dados fictícios, para os destinatários da tela (mesmo não salvos). */
  async simular(tipo: string, destinatarios: unknown): Promise<SimularAlertaResposta> {
    if (!TIPOS_NOTIFICACAO.includes(tipo as TipoNotificacao)) throw new ErroNaoEncontrado('Tipo de notificação inválido.')

    let emails: string[]
    let smtpAtivo: boolean
    try {
      emails = this.notificacoes.destinatarios(this.destinatariosDaLista(destinatarios)).map((d) => d.email)
      smtpAtivo = this.smtpConfigurado()
    } catch (erro) {
      throw new ErroValidacao(erro instanceof Error ? erro.message : 'Configuração inválida.')
    }
    if (!emails.length) throw new ErroValidacao('A lista de destinatários está vazia.')

    const { enviados, falhas } = await this.notificacoes.simular(notificacaoSimulada(tipo as TipoNotificacao), emails)
    return { enviados, falhas, smtp_ativo: smtpAtivo }
  }

  private configuracoesAtuais(): ConfigAlerta[] {
    return TIPOS_NOTIFICACAO.map((tipo) => this.repos.configAlerta.obter(tipo))
  }

  // E-mails válidos e todos presentes na lista de destinatários.
  private destinatariosDaLista(entrada: unknown): string[] {
    const emails = normalizarDestinatarios(entrada ?? [])
    const lista = new Set(this.repos.destinatario.emails().map((e) => e.toLowerCase()))
    const fora = emails.find((e) => !lista.has(e.toLowerCase()))
    if (fora) throw new ErroParametroAlerta(`${fora} não está na lista de destinatários.`)
    return emails
  }

  // Valida um item e devolve a configuração pronta para gravar.
  private normalizarConfig(item: unknown): ConfigAlerta {
    const { tipo, ativo, destinatarios, parametros } = (item ?? {}) as Record<string, unknown>
    if (!TIPOS_NOTIFICACAO.includes(tipo as TipoNotificacao)) throw new ErroParametroAlerta('Tipo de notificação inválido.')
    const t = tipo as TipoNotificacao
    try {
      return {
        tipo: t,
        ativo: Boolean(ativo),
        destinatarios: this.destinatariosDaLista(destinatarios),
        parametros: normalizarParametros(t, parametros),
      }
    } catch (erro) {
      if (erro instanceof ErroParametroAlerta) throw new ErroParametroAlerta(`${t}: ${erro.message}`)
      throw erro
    }
  }
}
