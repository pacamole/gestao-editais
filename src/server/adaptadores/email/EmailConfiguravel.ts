import type { ConfigSmtp, EmailPorta, MensagemEmail, ResultadoEnvio } from '../../portas/EmailPorta.js'
import { ConsoleAdaptador } from './ConsoleAdaptador.js'
import { SmtpAdaptador } from './SmtpAdaptador.js'

// Lê a configuração do SMTP a cada envio, então mudanças valem sem reiniciar.
// Sem SMTP configurado, imprime no terminal.
export class EmailConfiguravel implements EmailPorta {
  private readonly console = new ConsoleAdaptador()
  private smtp?: { chave: string; adaptador: SmtpAdaptador }

  constructor(private readonly lerConfig: () => ConfigSmtp | null) {}

  async enviar(mensagem: MensagemEmail): Promise<ResultadoEnvio> {
    const config = this.lerConfig()
    if (!config) return this.console.enviar(mensagem)
    const chave = JSON.stringify(config)
    if (this.smtp?.chave !== chave) this.smtp = { chave, adaptador: new SmtpAdaptador(config) }
    return this.smtp.adaptador.enviar(mensagem)
  }
}
