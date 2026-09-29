// Carrega o .env (se existir) antes de qualquer leitura de process.env.
try {
  process.loadEnvFile()
} catch {
  // sem .env: segue com as variáveis do ambiente
}
