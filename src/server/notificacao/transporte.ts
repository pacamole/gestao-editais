import nodemailer, { type Transporter } from 'nodemailer'

export type MensagemEmail = {
  para: string
  assunto: string
  texto: string
}

// Forma de entregar um e-mail. Trocar a implementação não afeta o resto do módulo.
export interface TransporteEmail {
  enviar(mensagem: MensagemEmail): Promise<void>
}

export type ConfigSmtp = {
  host: string
  porta: number
  usuario: string
  senha: string
  remetente: string
}

export class SmtpTransporte implements TransporteEmail {
  private readonly transporter: Transporter

  constructor(private readonly config: ConfigSmtp) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.porta,
      secure: config.porta === 465,
      auth: { user: config.usuario, pass: config.senha },
    })
  }

  async enviar(mensagem: MensagemEmail): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.remetente,
      to: mensagem.para,
      subject: mensagem.assunto,
      text: mensagem.texto,
    })
  }
}

// Desenvolvimento: imprime o e-mail no terminal em vez de enviar.
export class ConsoleTransporte implements TransporteEmail {
  async enviar(mensagem: MensagemEmail): Promise<void> {
    console.log(
      ['', `✉  Para: ${mensagem.para}`, `   Assunto: ${mensagem.assunto}`, '', mensagem.texto, '─'.repeat(60)].join('\n'),
    )
  }
}

// Lê a configuração do SMTP a cada envio, então mudanças valem sem reiniciar.
// Sem SMTP configurado, imprime no terminal.
export class TransporteConfiguravel implements TransporteEmail {
  private readonly console = new ConsoleTransporte()
  private smtp?: { chave: string; transporte: SmtpTransporte }

  constructor(private readonly lerConfig: () => ConfigSmtp | null) {}

  async enviar(mensagem: MensagemEmail): Promise<void> {
    const config = this.lerConfig()
    if (!config) return this.console.enviar(mensagem)
    const chave = JSON.stringify(config)
    if (this.smtp?.chave !== chave) this.smtp = { chave, transporte: new SmtpTransporte(config) }
    await this.smtp.transporte.enviar(mensagem)
  }
}
