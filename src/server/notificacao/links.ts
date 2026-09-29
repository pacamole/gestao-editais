// URLs das páginas do sistema (§5) para os e-mails.
export class Links {
  private static get base(): string {
    return (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  }

  static dashboard = () => `${Links.base}/`
  static edital = (id: string) => `${Links.base}/editais/${id}`
  static novaEntrada = () => `${Links.base}/editais/novo`
  static fontes = () => `${Links.base}/fontes`
  static alertas = () => `${Links.base}/alertas`
}
