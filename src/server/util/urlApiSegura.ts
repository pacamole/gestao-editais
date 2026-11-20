import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { ErroServicoExterno, ErroValidacao } from '../dominio/erros.js'

export function urlApiValida(valor: string): boolean {
  try {
    const url = new URL(valor)
    const host = url.hostname.toLowerCase()
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || host.startsWith('[') || isIP(host)) return false
    return host !== 'localhost' && !host.endsWith('.localhost') && !host.endsWith('.local') &&
      !host.endsWith('.internal') && !host.endsWith('.intranet') && !host.endsWith('.lan')
  } catch {
    return false
  }
}

function enderecoPrivado(endereco: string): boolean {
  if (isIP(endereco) === 4) {
    const [a, b, c] = endereco.split('.').map(Number)
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
  }

  if (isIP(endereco) === 6) {
    const primeiroGrupo = Number.parseInt(endereco.split(':')[0] || '0', 16)
    return (primeiroGrupo & 0xe000) !== 0x2000 || endereco.toLowerCase().startsWith('2001:db8:')
  }
  return true
}

export async function validarDestinoApi(valor: string): Promise<void> {
  if (!urlApiValida(valor)) throw new ErroValidacao('Informe uma URL HTTPS pública e válida para a API compatível com OpenAI.')
  const host = new URL(valor).hostname
  let enderecos: { address: string }[]
  try {
    enderecos = await lookup(host, { all: true, verbatim: true })
  } catch {
    throw new ErroServicoExterno('Não foi possível localizar o domínio da API. Confira a URL e tente novamente.')
  }
  if (!enderecos.length || enderecos.some(({ address }) => enderecoPrivado(address))) {
    throw new ErroValidacao('A URL da API deve apontar para um endereço público.')
  }
}
