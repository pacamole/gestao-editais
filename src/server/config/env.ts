import path from 'node:path'
import { ehExecutavel, pastaDadosExecutavel } from './executavel.js'

// Carrega o .env (se existir) antes de qualquer leitura de process.env.
// No executável, o da pasta de dados: não depende da pasta de onde o .exe foi aberto.
try {
  process.loadEnvFile(ehExecutavel ? path.join(pastaDadosExecutavel, '.env') : undefined)
} catch {
  // sem .env: segue com as variáveis do ambiente
}
