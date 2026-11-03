// Abre uma página num navegador invisível (Chromium, via Playwright) e guarda as respostas JSON que ela
// carrega. Serve para sites montados por JavaScript, em que o HTML baixado direto só tem menus: os dados
// das chamadas vêm de uma API que a própria página consulta. Usado só na descoberta da fonte; a busca
// diária chama o endereço encontrado direto.
import { createRequire } from 'node:module'
import path from 'node:path'
import { ehExecutavel, pastaRecursos } from '../config/executavel.js'

export type RespostaJson = { url: string; dados: unknown }
export type PaginaRenderizada = { html: string; respostasJson: RespostaJson[] }

const TEMPO_LIMITE_MS = 20_000
const TAMANHO_MAXIMO_JSON = 2 * 1024 * 1024
const MAXIMO_RESPOSTAS = 40
// No executável não vai o Chromium: usa o navegador do computador (o Edge vem com o Windows).
const CANAIS_EXECUTAVEL = ['msedge', 'chrome']

export class ErroNavegadorIndisponivel extends Error {
  constructor() {
    super(
      ehExecutavel
        ? 'Este site precisa do Microsoft Edge ou do Google Chrome, e nenhum dos dois foi encontrado neste computador.'
        : 'Este site precisa do navegador invisível, que não está instalado. Rode "npx playwright install chromium" no servidor.',
    )
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

type Playwright = typeof import('playwright')
type Navegador = Awaited<ReturnType<Playwright['chromium']['launch']>>

// No executável, o Playwright fica na pasta extraída: ele lê arquivos próprios do disco e não cabe no servidor empacotado.
async function carregarPlaywright(): Promise<Playwright> {
  if (pastaRecursos) return createRequire(path.join(pastaRecursos, 'navegador.js'))('playwright-core') as Playwright
  return import('playwright')
}

async function abrirNavegador(playwright: Playwright): Promise<Navegador> {
  for (const channel of ehExecutavel ? CANAIS_EXECUTAVEL : [undefined]) {
    try {
      return await playwright.chromium.launch({ headless: true, channel })
    } catch (erro) {
      if (!/Executable doesn't exist|is not found|playwright install/i.test(String(erro))) throw erro
    }
  }
  throw new ErroNavegadorIndisponivel()
}

export async function abrirPagina(url: string): Promise<PaginaRenderizada> {
  let playwright: Playwright
  try {
    playwright = await carregarPlaywright()
  } catch {
    throw new ErroNavegadorIndisponivel()
  }

  const navegador = await abrirNavegador(playwright)

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
