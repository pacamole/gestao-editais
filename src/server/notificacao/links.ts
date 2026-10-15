import { appUrl } from '../config/app.js'

// URLs das páginas do sistema (§5) para os e-mails.
export class Links {
  private static readonly base = appUrl

  static dashboard = () => `${Links.base}/`
  static edital = (id: string) => `${Links.base}/editais/${id}`
  static novaEntrada = () => `${Links.base}/editais/novo`
  static fontes = () => `${Links.base}/configuracoes/fontes`
  static alertas = () => `${Links.base}/configuracoes/alertas`
}
