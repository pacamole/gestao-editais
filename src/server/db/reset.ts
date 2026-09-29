// Apaga o banco e recria do zero: schema.sql + seed.
import '../env.js'
import fs from 'node:fs'
import { arquivoBanco, arquivoSchema } from '../paths.js'

for (const sufixo of ['', '-wal', '-shm']) fs.rmSync(arquivoBanco + sufixo, { force: true })

// Import dinâmico: o banco só pode ser aberto depois de apagado.
const { db } = await import('./index.js')
const { semear } = await import('./seed.js')

db.exec(fs.readFileSync(arquivoSchema, 'utf8'))
await semear()

console.log(`banco recriado em ${arquivoBanco}`)
