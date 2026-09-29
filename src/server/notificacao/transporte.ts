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

// SMTP se SMTP_HOST estiver definido; senão, console.
export function criarTransporte(): TransporteEmail {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env
  if (!SMTP_HOST) {
    console.warn('SMTP_HOST não definido: e-mails serão apenas impressos no terminal.')
    return new ConsoleTransporte()
  }
  if (!SMTP_USER || !SMTP_PASS) throw new Error('Defina SMTP_USER e SMTP_PASS no .env.')
  return new SmtpTransporte({
    host: SMTP_HOST,
    porta: Number(SMTP_PORT ?? 465),
    usuario: SMTP_USER,
    senha: SMTP_PASS,
    remetente: SMTP_FROM ?? `Editais I9+ <${SMTP_USER}>`,
  })
}
