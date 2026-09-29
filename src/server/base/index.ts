import path from 'node:path'
import { db } from '../db/index.js'
import { arquivoBanco, root } from '../paths.js'
import { BaseDados } from './BaseDados.js'

export const pastaExportacoes = path.join(root, 'exportacoes')

// Backups ficam ao lado do arquivo do banco (DATABASE_PATH).
export const baseDados = new BaseDados(db, path.join(path.dirname(arquivoBanco), 'backups'))

export function nomeExportacao(): string {
  return `editais-${BaseDados.carimbo()}.db`
}

export { BaseDados, ErroImportacao } from './BaseDados.js'
