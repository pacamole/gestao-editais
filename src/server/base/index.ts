import path from 'node:path'
import { db } from '../db/index.js'
import { arquivoBanco, arquivoSchema, root } from '../config/paths.js'
import { BaseDados } from './BaseDados.js'

export const pastaExportacoes = path.join(root, 'exportacoes')

// Backups ficam ao lado do arquivo do banco (DATABASE_PATH), também quando a base está na nuvem.
// `() => db`: sempre a conexão em uso, mesmo depois de trocar entre local e nuvem.
export const baseDados = new BaseDados(() => db, path.join(path.dirname(arquivoBanco), 'backups'), arquivoSchema)

export function nomeExportacao(): string {
  return `editais-${BaseDados.carimbo()}.db`
}

export { BaseDados, ErroImportacao, type AnaliseNuvem } from './BaseDados.js'
