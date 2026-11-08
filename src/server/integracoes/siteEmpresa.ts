import { lerPaginaPublica } from './pagina.js'

export const MAXIMO_PAGINAS_SITE = 500
const MAXIMO_CARACTERES_TOTAL = 10_000_000
const MAXIMO_LINKS_FILA = 10_000
const MAXIMO_SITEMAPS = 20
const MAXIMO_URLS_SITEMAP = 20_000

export type PaginaSiteEmpresa = { url: string; texto: string; prioridade: number }

export type LeituraSiteEmpresa = {
  texto: string
  paginas: PaginaSiteEmpresa[]
  paginasLidas: number
  aviso: string | null
}

const PALAVRAS_PRIORITARIAS = [
  'sobre', 'empresa', 'quem-somos', 'institucional', 'historia',
  'produto', 'produtos', 'servico', 'servicos', 'solucao', 'solucoes', 'tecnologia',
  'inovacao', 'pesquisa', 'desenvolvimento', 'p-d', 'atuacao', 'portfolio', 'projetos',
]

function prioridadeUrl(url: URL): number {
  let caminho = url.pathname.toLowerCase()
  try {
    caminho = decodeURIComponent(caminho)
  } catch {
    // URL encoding can be malformed; the encoded path can still be scored safely.
  }
  return PALAVRAS_PRIORITARIAS.reduce((total, termo) => total + (caminho.includes(termo) ? 10 : 0), 0)
    + (caminho === '/' ? 5 : 0)
}

function urlInterna(endereco: string, origem: URL): string | null {
  try {
    const url = new URL(endereco, origem)
    if (url.hostname.toLowerCase() !== origem.hostname.toLowerCase()) return null
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    url.hash = ''
    for (const chave of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$)/i.test(chave)) url.searchParams.delete(chave)
    }
    url.searchParams.sort()
    return url.href
  } catch {
    return null
  }
}

async function urlsDoSitemap(origem: URL, lerPagina: typeof lerPaginaPublica): Promise<{ urls: string[]; falhas: number; limiteAtingido: boolean }> {
  const fila = [
    new URL('/sitemap.xml', origem).href,
    new URL('/sitemap_index.xml', origem).href,
    new URL('/wp-sitemap.xml', origem).href,
  ]
  const visitados = new Set<string>()
  const paginas = new Set<string>()
  let falhas = 0

  while (fila.length && visitados.size < MAXIMO_SITEMAPS && paginas.size < MAXIMO_URLS_SITEMAP) {
    const sitemap = fila.shift()!
    if (visitados.has(sitemap)) continue
    visitados.add(sitemap)
    try {
      const resultado = await lerPagina(sitemap)
      for (const link of resultado.links ?? []) {
        const url = urlInterna(link, origem)
        if (!url) continue
        if (/\.xml(?:\.gz)?(?:$|\?)/i.test(url) && !visitados.has(url)) fila.push(url)
        else paginas.add(url)
        if (paginas.size >= MAXIMO_URLS_SITEMAP) break
      }
    } catch (erro) {
      // Conventional sitemap paths commonly return 404 when a site does not publish a sitemap.
      // That is not a site-read failure; the crawler still follows the homepage's internal links.
      const mensagem = erro instanceof Error ? erro.message : String(erro)
      if (!/HTTP (404|410)\b/.test(mensagem)) falhas++
    }
  }
  return { urls: [...paginas], falhas, limiteAtingido: fila.length > 0 || paginas.size >= MAXIMO_URLS_SITEMAP }
}

export async function lerSiteEmpresa(
  endereco: string,
  lerPagina: typeof lerPaginaPublica = lerPaginaPublica,
): Promise<LeituraSiteEmpresa> {
  let inicial: URL
  try {
    inicial = new URL(endereco)
  } catch {
    throw new Error('O endereço do site da empresa não é uma URL válida.')
  }

  let paginaInicial
  try {
    paginaInicial = await lerPagina(inicial.href)
  } catch (erro) {
    const motivo = erro instanceof Error ? erro.message : String(erro)
    throw new Error(`Não foi possível validar a página principal do site informado: ${motivo}`, { cause: erro })
  }
  if (!paginaInicial.texto.trim() || paginaInicial.texto.trim().length < 80) {
    throw new Error('A página principal do site informado não contém conteúdo suficiente para validar o site.')
  }

  const sitemap = await urlsDoSitemap(inicial, lerPagina)
  const fila = [inicial.href, ...sitemap.urls]
  const enfileiradas = new Set(fila)
  const paginas: PaginaSiteEmpresa[] = []
  const falhas: string[] = []
  let tamanho = 0
  let linksExcedentes = false
  const urlsLidas = new Set<string>()

  fila.sort((a, b) => prioridadeUrl(new URL(b)) - prioridadeUrl(new URL(a)))

  while (fila.length && paginas.length < MAXIMO_PAGINAS_SITE && tamanho < MAXIMO_CARACTERES_TOTAL) {
    const url = fila.shift()!
    if (urlsLidas.has(url)) continue
    urlsLidas.add(url)
    try {
      const pagina = url === inicial.href ? paginaInicial : await lerPagina(url)
      const conteudo = pagina.texto.slice(0, MAXIMO_CARACTERES_TOTAL - tamanho)
      paginas.push({ url, texto: conteudo, prioridade: prioridadeUrl(new URL(url)) })
      tamanho += conteudo.length
      for (const link of pagina.links ?? []) {
        const interno = urlInterna(link, inicial)
        if (interno && !enfileiradas.has(interno) && enfileiradas.size < MAXIMO_LINKS_FILA) {
          enfileiradas.add(interno)
          fila.push(interno)
        } else if (interno && !enfileiradas.has(interno)) {
          linksExcedentes = true
        }
      }
      fila.sort((a, b) => prioridadeUrl(new URL(b)) - prioridadeUrl(new URL(a)))
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro)
      if (paginas.length === 0 && url === inicial.href) throw erro
      falhas.push(`${url}: ${mensagem}`)
    }
  }

  if (!paginas.length) throw new Error('Não foi possível ler nenhuma página pública do site da empresa.')
  const avisos = [
    fila.length && paginas.length >= MAXIMO_PAGINAS_SITE
      ? `A leitura atingiu o limite de ${MAXIMO_PAGINAS_SITE} páginas internas; há páginas pendentes.`
      : '',
    tamanho >= MAXIMO_CARACTERES_TOTAL
      ? `A leitura atingiu o limite de ${MAXIMO_CARACTERES_TOTAL.toLocaleString('pt-BR')} caracteres.`
      : '',
    linksExcedentes ? 'O limite de URLs na fila foi atingido; algumas páginas podem não ter sido visitadas.' : '',
    sitemap.limiteAtingido ? 'A descoberta do sitemap atingiu o limite de URLs ou arquivos sitemap.' : '',
    sitemap.falhas ? `${sitemap.falhas} sitemap(s) não puderam ser lidos; a descoberta também usa os links internos.` : '',
    falhas.length ? `${falhas.length} página(s) interna(s) não puderam ser lidas.` : '',
  ].filter(Boolean)

  return {
    texto: paginas.map((pagina) => `\n\n[Página: ${pagina.url}]\n${pagina.texto}`).join(''),
    paginas,
    paginasLidas: paginas.length,
    aviso: avisos.length ? avisos.join(' ') : null,
  }
}
