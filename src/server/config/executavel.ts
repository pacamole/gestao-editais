import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sea from 'node:sea'

// Rodando como gestao-editais.exe (Node SEA, gerado pelo npm run build)?
export const ehExecutavel = sea.isSea()

// Onde o executável guarda o banco, as exportações e o .env: fixa na pasta do usuário,
// para os dados não dependerem de onde o .exe está nem se perderem ao movê-lo.
export const pastaDadosExecutavel = path.join(os.homedir(), 'GestaoEditais')

// O front-end, o db/schema.sql e o binário do libsql vêm embutidos no .exe e são extraídos para
// uma pasta temporária, uma por versão do .exe (um .node em uso não pode ser sobrescrito no Windows).
function extrairRecursos(): string {
  const exe = fs.statSync(process.execPath)
  const destino = path.join(os.tmpdir(), 'gestao-editais', `${exe.size}-${Math.trunc(exe.mtimeMs)}`)
  const marca = path.join(destino, '.extraido')
  if (fs.existsSync(marca)) return destino

  for (const chave of sea.getAssetKeys()) {
    const arquivo = path.join(destino, chave)
    fs.mkdirSync(path.dirname(arquivo), { recursive: true })
    fs.writeFileSync(arquivo, new Uint8Array(sea.getRawAsset(chave)))
  }
  fs.writeFileSync(marca, '')
  return destino
}

export const pastaRecursos = ehExecutavel ? extrairRecursos() : null
