import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ehExecutavel, pastaDadosExecutavel, pastaRecursos } from './executavel.js'

// Raiz do projeto, tanto rodando de src/server/config (dev) quanto de dist/server/config (prod).
// No executável, a pasta de dados do usuário: o banco e as exportações ficam nela.
export const root = ehExecutavel
  ? pastaDadosExecutavel
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

// Arquivos que acompanham o sistema; no executável, extraídos de dentro do .exe.
const recursos = pastaRecursos ?? root

export const arquivoBanco = path.resolve(root, process.env.DATABASE_PATH ?? 'data/editais.db')
export const arquivoSchema = path.join(recursos, 'db/schema.sql')
export const pastaCliente = path.join(recursos, 'dist/client')
