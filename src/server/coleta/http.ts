const LIMITE = 25 * 1024 * 1024

// Coleta sequencial, com intervalo, limite de tamanho e timeout. Sem contornar login/bloqueios.
export async function baixar(url: string): Promise<Uint8Array> {
  const endereco = new URL(url)
  if (!['https:', 'http:'].includes(endereco.protocol)) throw new Error('Endereço deve usar HTTP ou HTTPS.')
  await new Promise((resolve) => setTimeout(resolve, 300))
  const resposta = await fetch(url, { signal: AbortSignal.timeout(30_000), headers: { 'User-Agent': 'GestaoEditais/0.1 (coleta de chamadas publicas)' } })
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}: ${url}`)
  if (Number(resposta.headers.get('content-length')) > LIMITE) throw new Error('Documento excede 25 MB.')
  const leitor = resposta.body?.getReader()
  if (!leitor) throw new Error('Resposta sem conteúdo.')
  const partes: Uint8Array[] = []
  let tamanho = 0
  try {
    while (true) {
      const parte = await leitor.read()
      if (parte.done) break
      tamanho += parte.value.length
      if (tamanho > LIMITE) throw new Error('Documento excede 25 MB.')
      partes.push(parte.value)
    }
  } finally {
    await leitor.cancel()
  }
  return Buffer.concat(partes)
}
