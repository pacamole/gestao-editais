import './env.js'

// Endereço do sistema (APP_URL): usado nos links dos e-mails e para saber em que porta o servidor escuta.
const url = new URL(process.env.APP_URL || 'http://localhost:3000')

export const appUrl = url.origin + url.pathname.replace(/\/$/, '')

// Porta escrita na URL; sem porta, a padrão do protocolo (80 para http, 443 para https).
export const porta = Number(url.port) || (url.protocol === 'https:' ? 443 : 80)
