export type MensagemEmail = {
  para: string
  assunto: string
  texto: string
}

// ENVIADO: entregue ao provedor. SIMULADO: apenas exibido (nenhum e-mail saiu do sistema).
export type ResultadoEnvio = 'ENVIADO' | 'SIMULADO'

// Forma de entregar um e-mail. Trocar o adaptador não afeta o resto do sistema.
export interface EmailPorta {
  enviar(mensagem: MensagemEmail): Promise<ResultadoEnvio>
}

export type ConfigSmtp = {
  host: string
  porta: number
  usuario: string
  senha: string
  remetente: string
}
