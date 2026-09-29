import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt) as (senha: string, sal: Buffer, tamanho: number) => Promise<Buffer>
const TAMANHO = 64

// Formato armazenado: "scrypt$<sal hex>$<hash hex>"
export async function gerarHashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16)
  const hash = await scryptAsync(senha, sal, TAMANHO)
  return `scrypt$${sal.toString('hex')}$${hash.toString('hex')}`
}

export async function verificarSenha(senha: string, armazenado: string): Promise<boolean> {
  const [algoritmo, salHex, hashHex] = armazenado.split('$')
  if (algoritmo !== 'scrypt' || !salHex || !hashHex) return false
  const esperado = Buffer.from(hashHex, 'hex')
  const hash = await scryptAsync(senha, Buffer.from(salHex, 'hex'), esperado.length)
  return timingSafeEqual(hash, esperado)
}
