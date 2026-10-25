// Apaga o banco e recria do zero: schema.sql + dados iniciais (perfil, critérios, alertas e fontes).
import '../config/env.js'
import fs from 'node:fs'
import { arquivoBanco, arquivoSchema } from '../config/paths.js'

for (const sufixo of ['', '-wal', '-shm']) fs.rmSync(arquivoBanco + sufixo, { force: true })

// Import dinâmico: o banco só pode ser aberto depois de apagado.
const { db, transacao } = await import('../db/index.js')
const { bootstrapServico, fonteServico } = await import('../composicao.js')

db.exec(fs.readFileSync(arquivoSchema, 'utf8'))
transacao(() => {
  fonteServico.garantirFontesPadrao()
  bootstrapServico.garantir()
})

console.log(`banco recriado em ${arquivoBanco}`)
console.log('Abra o sistema e crie uma conta para entrar.')
