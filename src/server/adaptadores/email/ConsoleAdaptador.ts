import type { EmailPorta, MensagemEmail, ResultadoEnvio } from '../../portas/EmailPorta.js'

// Desenvolvimento: imprime o e-mail no terminal em vez de enviar.
export class ConsoleAdaptador implements EmailPorta {
  async enviar(mensagem: MensagemEmail): Promise<ResultadoEnvio> {
    console.log(
      ['', `✉  Para: ${mensagem.para}`, `   Assunto: ${mensagem.assunto}`, '', mensagem.texto, '─'.repeat(60)].join('\n'),
    )
    return 'SIMULADO'
  }
}
