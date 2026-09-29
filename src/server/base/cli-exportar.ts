// Exporta a base inteira para um arquivo .db.
// Uso: npm run db:exportar              -> exportacoes/editais-AAAA-MM-DD_HHMM.db
//      npm run db:exportar -- base.db   -> caminho escolhido
import '../env.js'
import path from 'node:path'
import { bancoVazio } from '../db/index.js'
import { baseDados, nomeExportacao, pastaExportacoes } from './index.js'

if (bancoVazio()) {
  console.error('Banco não criado. Rode `npm run db:reset` ou importe uma base com `npm run db:importar`.')
  process.exit(1)
}

const destino = path.resolve(process.argv[2] ?? path.join(pastaExportacoes, nomeExportacao()))
const resultado = baseDados.exportar(destino)

console.table(Object.fromEntries(resultado.tabelas.map((t) => [t.nome, t.registros])))
console.log(`base exportada em ${resultado.arquivo} (${(resultado.tamanhoBytes / 1024).toFixed(0)} KB)`)
