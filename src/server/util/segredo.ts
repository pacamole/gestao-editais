import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { ErroValidacao } from '../dominio/erros.js'

function chaveMestra(): Buffer {
  const valor = process.env.IA_CHAVE_CRIPTOGRAFIA?.trim()
  if (!valor) {
    throw new ErroValidacao('Configure IA_CHAVE_CRIPTOGRAFIA no ambiente do servidor para cadastrar ou usar chaves de IA.')
  }

  const chave = /^[\da-f]{64}$/i.test(valor) ? Buffer.from(valor, 'hex') : Buffer.from(valor, 'base64')
  if (chave.length !== 32) {
    throw new ErroValidacao('IA_CHAVE_CRIPTOGRAFIA deve conter 32 bytes em hexadecimal (64 caracteres) ou Base64.')
  }
  return chave
}

export function cifrarSegredo(texto: string): string {
  const iv = randomBytes(12)
  const cifra = createCipheriv('aes-256-gcm', chaveMestra(), iv)
  const criptografado = Buffer.concat([cifra.update(texto, 'utf8'), cifra.final()])
  return `v1:${iv.toString('base64')}:${cifra.getAuthTag().toString('base64')}:${criptografado.toString('base64')}`
}

export function decifrarSegredo(valor: string): string {
  const [versao, ivBase64, tagBase64, dadoBase64] = valor.split(':')
  if (versao !== 'v1' || !ivBase64 || !tagBase64 || !dadoBase64) {
    throw new ErroValidacao('A chave de API armazenada não pode ser lida. Cadastre a conexão novamente.')
  }

  try {
    const decifra = createDecipheriv('aes-256-gcm', chaveMestra(), Buffer.from(ivBase64, 'base64'))
    decifra.setAuthTag(Buffer.from(tagBase64, 'base64'))
    return Buffer.concat([decifra.update(Buffer.from(dadoBase64, 'base64')), decifra.final()]).toString('utf8')
  } catch (erro) {
    if (erro instanceof ErroValidacao) throw erro
    throw new ErroValidacao('Não foi possível descriptografar a chave de API. Confira IA_CHAVE_CRIPTOGRAFIA.')
  }
}
