import type { Papel, TipoNotificacao } from '../entidades.js'

export type Destinatario = {
  nome: string
  email: string
}

// Um e-mail da §11. Cada tipo (E01…E06) é uma subclasse que sabe montar assunto e corpo.
export abstract class Notificacao {
  protected static readonly PREFIXO = '[Editais I9+]'

  abstract readonly tipo: TipoNotificacao
  // Quem recebe quando config_alerta não define destinatários.
  abstract readonly papeisPadrao: readonly Papel[]

  /**
   * @param editalId edital relacionado; null em resumos e alertas de fonte.
   * @param marco    parte da chave anti-spam (tipo, edital_id, marco): a mesma
   *                 combinação nunca é enviada duas vezes. Ex.: "7d" no E02.
   */
  constructor(
    readonly editalId: string | null,
    readonly marco = '',
  ) {}

  abstract assunto(): string

  protected abstract conteudo(destinatario: Destinatario): string

  corpo(destinatario: Destinatario): string {
    return [
      `Olá, ${destinatario.nome}.`,
      '',
      this.conteudo(destinatario),
      '',
      '—',
      'Gestor Inteligente de Editais · I9+',
      ...this.rodapeExtra(),
    ].join('\n')
  }

  protected rodapeExtra(): string[] {
    return []
  }
}
