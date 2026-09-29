// Envia um e-mail simples para conferir a configuração do SMTP.
// Uso: npm run email:teste -- destino@exemplo.com
import '../env.js'
import { criarTransporte } from './transporte.js'

const para = process.argv[2]
if (!para) {
  console.error('Uso: npm run email:teste -- destino@exemplo.com')
  process.exit(1)
}

await criarTransporte().enviar({
  para,
  assunto: '[Editais I9+] Teste de envio',
  texto: 'Se você recebeu este e-mail, o SMTP do Gestor de Editais está configurado corretamente.',
})
console.log(`e-mail de teste enviado para ${para}`)
