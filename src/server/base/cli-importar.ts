// Substitui todos os dados da base local pelos de um arquivo exportado.
// Uso: npm run db:importar -- exportacoes/editais-2026-09-28_2330.db
import '../env.js'
import fs from 'node:fs'
import path from 'node:path'
import { arquivoBanco, arquivoSchema } from '../paths.js'

const arquivo = process.argv[2]
if (!arquivo) {
  console.error('Uso: npm run db:importar -- caminho/do/arquivo.db')
  process.exit(1)
}

// Import dinâmico: o banco só é aberto depois de garantir que o schema existe.
const { bancoVazio, db } = await import('../db/index.js')
// Computador novo: cria as tabelas vazias antes de receber os dados.
if (bancoVazio()) db.exec(fs.readFileSync(arquivoSchema, 'utf8'))

const { baseDados, ErroImportacao } = await import('./index.js')
try {
  const resultado = baseDados.importar(path.resolve(arquivo))
  console.table(Object.fromEntries(resultado.tabelas.map((t) => [t.nome, t.registros])))
  console.log(`base importada em ${arquivoBanco}`)
  console.log(`backup da base anterior: ${resultado.backup}`)
} catch (erro) {
  if (!(erro instanceof ErroImportacao)) throw erro
  console.error(`Importação cancelada, nada foi alterado: ${erro.message}`)
  process.exit(1)
}
