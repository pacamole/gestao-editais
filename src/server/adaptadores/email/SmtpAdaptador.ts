import nodemailer, { type Transporter } from 'nodemailer'
import type { ConfigSmtp, EmailPorta, MensagemEmail, ResultadoEnvio } from '../../portas/EmailPorta.js'

export class SmtpAdaptador implements EmailPorta {
  private readonly transporter: Transporter

  constructor(private readonly config: ConfigSmtp) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.porta,
      secure: config.porta === 465,
      auth: { user: config.usuario, pass: config.senha },
    })
  }

  async enviar(mensagem: MensagemEmail): Promise<ResultadoEnvio> {
    await this.transporter.sendMail({
      from: this.config.remetente,
      to: mensagem.para,
      subject: mensagem.assunto,
      text: mensagem.texto,
    })
    return 'ENVIADO'
  }
}
