import type { Papel } from '../entidades.js'
import type { Repositorios } from '../repositorios/index.js'
import type { Destinatario, Notificacao } from './notificacao.js'
import type { TransporteEmail } from './transporte.js'

export type ResultadoDisparo =
  | 'ENVIADO'
  | 'PARCIAL' // parte dos destinatários falhou
  | 'FALHOU'
  | 'DESATIVADO' // tipo desligado em config_alerta
  | 'DUPLICADO' // já enviado (regra anti-spam)
  | 'SEM_DESTINATARIOS'

type RepositoriosServico = Pick<Repositorios, 'configAlerta' | 'usuario' | 'notificacaoLog'>

// Envia uma notificação: checa configuração e anti-spam, envia um e-mail por destinatário e registra no log.
export class NotificacaoServico {
  // Disparos em fila: dois disparos iguais simultâneos não passam juntos pela checagem anti-spam.
  private fila: Promise<unknown> = Promise.resolve()

  constructor(
    private readonly transporte: TransporteEmail,
    private readonly repositorios: RepositoriosServico,
  ) {}

  disparar(notificacao: Notificacao): Promise<ResultadoDisparo> {
    const resultado = this.fila.then(() => this.executar(notificacao))
    this.fila = resultado.catch(() => undefined)
    return resultado
  }

  private async executar(notificacao: Notificacao): Promise<ResultadoDisparo> {
    const { tipo, editalId, marco } = notificacao
    const config = this.repositorios.configAlerta.obter(tipo)
    if (!config.ativo) return 'DESATIVADO'
    if (this.repositorios.notificacaoLog.jaEnviada(tipo, editalId, marco)) return 'DUPLICADO'

    const destinatarios = this.destinatarios(config.destinatarios, notificacao.papeisPadrao)
    if (!destinatarios.length) return 'SEM_DESTINATARIOS'

    const assunto = notificacao.assunto()
    const enviados: string[] = []
    const falhas: string[] = []

    for (const destinatario of destinatarios) {
      try {
        await this.transporte.enviar({ para: destinatario.email, assunto, texto: notificacao.corpo(destinatario) })
        enviados.push(destinatario.email)
      } catch (erro) {
        console.error(`[notificação ${tipo}] falha ao enviar para ${destinatario.email}:`, erro)
        falhas.push(destinatario.email)
      }
    }

    const base = { tipo, edital_id: editalId, marco, assunto }
    if (enviados.length) this.repositorios.notificacaoLog.inserir({ ...base, destinatarios: enviados, status_envio: 'ENVIADO' })
    if (falhas.length) this.repositorios.notificacaoLog.inserir({ ...base, destinatarios: falhas, status_envio: 'FALHOU' })

    if (!falhas.length) return 'ENVIADO'
    return enviados.length ? 'PARCIAL' : 'FALHOU'
  }

  // E-mails fixos da configuração, ou os usuários ativos dos papéis padrão da notificação.
  private destinatarios(emailsFixos: string[], papeisPadrao: readonly Papel[]): Destinatario[] {
    if (emailsFixos.length) {
      return emailsFixos.map((email) => ({
        email,
        nome: this.repositorios.usuario.buscarPorEmail(email)?.nome ?? 'equipe',
      }))
    }
    return this.repositorios.usuario
      .listarAtivosPorPapel(papeisPadrao)
      .map(({ nome, email }) => ({ nome, email }))
  }
}
