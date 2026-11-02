// Abre uma página num navegador invisível (Chromium, via Playwright) e guarda as respostas JSON que ela
// carrega. Serve para sites montados por JavaScript, em que o HTML baixado direto só tem menus: os dados
// das chamadas vêm de uma API que a própria página consulta. Usado só na descoberta da fonte; a busca
// diária chama o endereço encontrado direto.

export type RespostaJson = { url: string; dados: unknown }
export type PaginaRenderizada = { html: string; respostasJson: RespostaJson[] }

const TEMPO_LIMITE_MS = 20_000
const TAMANHO_MAXIMO_JSON = 2 * 1024 * 1024
const MAXIMO_RESPOSTAS = 40

export class ErroNavegadorIndisponivel extends Error {
  constructor() {
    super('Este site precisa do navegador invisível, que não está instalado. Rode "npx playwright install chromium" no servidor.')
    this.name = 'ErroNavegadorIndisponivel'
  }
}

const mesmoSite = (a: string, b: string) => {
  const dominio = (url: string) => new URL(url).hostname.replace(/^www\./, '').split('.').slice(-3).join('.')
  try {
    return dominio(a) === dominio(b)
  } catch {
    return false
  }
}

export async function abrirPagina(url: string): Promise<PaginaRenderizada> {
  let playwright: typeof import('playwright')
  try {
    playwright = await import('playwright')
  } catch {
    throw new ErroNavegadorIndisponivel()
  }

  let navegador: Awaited<ReturnType<typeof playwright.chromium.launch>>
  try {
    navegador = await playwright.chromium.launch({ headless: true })
  } catch (erro) {
    if (/Executable doesn't exist|playwright install/i.test(String(erro))) throw new ErroNavegadorIndisponivel()
    throw erro
  }

  try {
    const pagina = await navegador.newPage({ userAgent: 'GestaoEditais/0.1 (coleta de chamadas publicas)' })
    const respostasJson: RespostaJson[] = []
    const pendentes: Promise<void>[] = []

    pagina.on('response', (resposta) => {
      const tipo = resposta.headers()['content-type'] ?? ''
      if (!/json/i.test(tipo) || !resposta.ok() || !mesmoSite(resposta.url(), url) || respostasJson.length >= MAXIMO_RESPOSTAS) return
      pendentes.push(
        resposta
          .body()
          .then((corpo) => {
            if (corpo.length > TAMANHO_MAXIMO_JSON) return
            respostasJson.push({ url: resposta.url(), dados: JSON.parse(corpo.toString('utf8')) })
          })
          .catch(() => {}),
      )
    })

    await pagina.goto(url, { waitUntil: 'networkidle', timeout: TEMPO_LIMITE_MS }).catch(async (erro) => {
      // Páginas que nunca ficam ociosas (anúncios, chats): segue com o que carregou até aqui.
      if (!/Timeout/i.test(String(erro))) throw erro
    })
    await Promise.all(pendentes)
    return { html: await pagina.content(), respostasJson }
  } finally {
    await navegador.close()
  }
}
