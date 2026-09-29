import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { arquivoBanco } from '../paths.js'

fs.mkdirSync(path.dirname(arquivoBanco), { recursive: true })

// Conexão única. Fora dos repositórios, use só para schema e transações.
export const db = new DatabaseSync(arquivoBanco)
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')
db.exec('PRAGMA busy_timeout = 5000')

export function bancoVazio(): boolean {
  return !db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'usuario'").get()
}

export function transacao<T>(fn: () => T): T {
  db.exec('BEGIN')
  try {
    const resultado = fn()
    db.exec('COMMIT')
    return resultado
  } catch (erro) {
    db.exec('ROLLBACK')
    throw erro
  }
}

export const agora = () => new Date().toISOString()
export const novoId = () => crypto.randomUUID()
