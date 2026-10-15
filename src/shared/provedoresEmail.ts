// Provedores de e-mail com servidor e porta já definidos, para a tela de E-mail (SMTP).

export type IdProvedor = 'DESLIGADO' | 'GMAIL' | 'OUTLOOK' | 'OUTRO'

export type ProvedorEmail = {
  nome: string
  host: string
  porta: number
  // Onde gerar a senha de app e o passo a passo, para quem nunca fez.
  ajudaSenha?: { url: string; passos: string[] }
}

export const NOME_REMETENTE_PADRAO = 'Editais I9+'

export const PROVEDORES_EMAIL: Record<Exclude<IdProvedor, 'DESLIGADO' | 'OUTRO'>, ProvedorEmail> = {
  GMAIL: {
    nome: 'Gmail',
    host: 'smtp.gmail.com',
    porta: 465,
    ajudaSenha: {
      url: 'https://myaccount.google.com/apppasswords',
      passos: [
        'Entre na conta Google que vai enviar os alertas.',
        'Ative a verificação em duas etapas, se ainda não estiver ativa.',
        'Abra "Senhas de app", crie uma com o nome "Editais I9+" e copie os 16 caracteres.',
      ],
    },
  },
  OUTLOOK: {
    nome: 'Outlook / Hotmail',
    host: 'smtp-mail.outlook.com',
    porta: 587,
    ajudaSenha: {
      url: 'https://account.microsoft.com/security',
      passos: [
        'Entre na conta Microsoft que vai enviar os alertas.',
        'Ative a verificação em duas etapas, se ainda não estiver ativa.',
        'Em "Opções de segurança avançadas", crie uma senha de app e copie-a.',
      ],
    },
  },
}

// Provedor que corresponde a um servidor salvo; servidor vazio = envio desligado.
export function provedorDoServidor(host: string, porta: number): IdProvedor {
  if (!host) return 'DESLIGADO'
  const id = (Object.keys(PROVEDORES_EMAIL) as (keyof typeof PROVEDORES_EMAIL)[]).find(
    (p) => PROVEDORES_EMAIL[p].host === host && PROVEDORES_EMAIL[p].porta === porta,
  )
  return id ?? 'OUTRO'
}
