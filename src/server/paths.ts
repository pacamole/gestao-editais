import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Raiz do projeto, tanto rodando de src/server (dev) quanto de dist/server (prod).
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export const arquivoBanco = path.resolve(root, process.env.DATABASE_PATH ?? 'data/editais.db')
export const arquivoSchema = path.join(root, 'db/schema.sql')
