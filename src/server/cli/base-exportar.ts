// Exporta a base inteira para um arquivo .db.
// Uso: npm run db:exportar              -> exportacoes/editais-AAAA-MM-DD_HHMM.db
//      npm run db:exportar -- base.db   -> caminho escolhido
import '../config/env.js'
import path from 'node:path'
import { baseServico } from '../composicao.js'
import { bancoVazio } from '../db/index.js'

if (bancoVazio()) {
  console.error('Banco não criado. Rode `npm run db:reset` ou importe uma base com `npm run db:importar`.')
  process.exit(1)
}

const destino = path.resolve(process.argv[2] ?? path.join(baseServico.pastaExportacoes, baseServico.nomeExportacao()))
const resultado = baseServico.exportarPara(destino)

console.table(Object.fromEntries(resultado.tabelas.map((t) => [t.nome, t.registros])))
console.log(`base exportada em ${resultado.arquivo} (${(resultado.tamanhoBytes / 1024).toFixed(0)} KB)`)
