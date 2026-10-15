// Envia um e-mail simples para conferir a configuração do SMTP.
// Uso: npm run email:teste -- destino@exemplo.com
import '../config/env.js'
import { configSmtp } from '../config/sistema.js'
import { TransporteConfiguravel } from './transporte.js'

const para = process.argv[2]
if (!para) {
  console.error('Uso: npm run email:teste -- destino@exemplo.com')
  process.exit(1)
}

await new TransporteConfiguravel(configSmtp).enviar({
  para,
  assunto: '[Editais I9+] Teste de envio',
  texto: 'Se você recebeu este e-mail, o SMTP do Gestor de Editais está configurado corretamente.',
})
console.log(`e-mail de teste enviado para ${para}`)
