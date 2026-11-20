import { arquivoEnvExecutavel, ehExecutavel } from './executavel.js'

// Carrega o .env (se existir) antes de qualquer leitura de process.env.
// No executável, o de ENV_PATH (definido no build) ou o da pasta do usuário.
try {
  process.loadEnvFile(ehExecutavel ? arquivoEnvExecutavel : undefined)
} catch {
  // sem .env: segue com as variáveis do ambiente
}
