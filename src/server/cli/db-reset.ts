// Apaga o banco e recria do zero: schema.sql + dados iniciais (perfil, critérios, alertas e fontes).
import '../config/env.js'
import fs from 'node:fs'
import { arquivoBanco } from '../config/paths.js'

for (const sufixo of ['', '-wal', '-shm']) fs.rmSync(arquivoBanco + sufixo, { force: true })

// Import dinâmico: o banco só pode ser aberto depois de apagado.
const { criarBaseNova } = await import('../composicao.js')
criarBaseNova()

console.log(`banco recriado em ${arquivoBanco}`)
console.log('Abra o sistema e crie uma conta para entrar.')
