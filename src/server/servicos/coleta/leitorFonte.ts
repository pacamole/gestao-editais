import { load, type CheerioAPI } from 'cheerio'
import { acumulador, limpar, type Publicacao } from './publicacoes.js'

export type { Publicacao } from './publicacoes.js'

/** Algo da fonte que pode ser uma chamada; a IA decide quais são. */
export type LinkCandidato = Publicacao & {
  /** Informações extras do item (situação, prazo…), mostradas à IA junto com o título. */
  detalhe?: string
  /** Texto do item, usado como conteúdo do edital quando a fonte não tem PDF (itens de API). */
  texto?: string
}

// Acima disso a página é um portal enorme; os primeiros itens bastam para achar as chamadas da listagem.
const MAXIMO_CANDIDATOS = 250

export const pareceFeed = (conteudo: string) => /^\s*(<\?xml[^>]*>\s*)?<(rss|feed)[\s>]/i.test(conteudo)

// ---- Feed (RSS/Atom) ----

/** Itens de um feed RSS ou Atom. */
export function linksDoFeed(conteudo: string, base: string): LinkCandidato[] {
  const $ = load(conteudo, { xmlMode: true })
  const links = acumulador(base)
  $('item').each((_, e) => links.adicionar($(e).children('title').text(), $(e).children('link').first().text().trim()))
  $('entry').each((_, e) => {
    const link = $(e).children('link[rel="alternate"], link').first()
    links.adicionar($(e).children('title').text(), link.attr('href') ?? link.text())
  })
  return links.lista()
}

/** Feeds que a página anuncia no <head> (<link rel="alternate" type="application/rss+xml">). */
export function feedsAnunciados(html: string, base: string): string[] {
  const $ = load(html)
  const feeds = new Set<string>()
  $('link[rel="alternate"]').each((_, e) => {
    const tipo = ($(e).attr('type') ?? '').toLowerCase()
    const href = $(e).attr('href')
    if (!href || !/rss|atom/.test(tipo)) return
    try {
      feeds.add(new URL(href, base).href)
    } catch {
      // endereço inválido: ignora
    }
  })
  return [...feeds]
}

// ---- Página HTML ----

// "Ver documentos", "Saiba mais": o link não diz qual é a chamada; o título está no bloco em volta.
const TEXTO_GENERICO = /^(ver|veja|acesse|acessar|saiba|leia|clique|mais|detalhes|documentos?|download|baixar|aqui|link|edital)\b/i

function textoDoLink(a: ReturnType<CheerioAPI>): string {
  const proprio = limpar(a.attr('title') || a.text())
  if (proprio.split(' ').length > 3 && !TEXTO_GENERICO.test(proprio)) return proprio
  // Sobe até o cartão da chamada: um bloco com mais texto que o link e com no máximo 3 links.
  // Bloco com muitos links é menu ou lista, e o texto dele não descreve este link.
  let bloco = a.parent()
  for (let nivel = 0; nivel < 4 && bloco.length; nivel++, bloco = bloco.parent()) {
    if (bloco.find('a[href]').length > 3) break
    const texto = limpar(bloco.text())
    if (texto.length > proprio.length + 15) return texto.slice(0, 200)
  }
  return proprio
}

// Links do conteúdo de uma página HTML, sem menus, cabeçalho e rodapé. O texto inclui os títulos de seção
// acima do link ("Abertas", "Encerradas"), que ajudam a IA a separar chamada aberta de encerrada.
function linksDaPagina(html: string, base: string): LinkCandidato[] {
  const $ = load(html)
  $('nav,header,footer,script,style,noscript,form[role="search"]').remove()
  const links = acumulador(base)
  const titulos: string[] = [] // título vigente de cada nível (h1..h4)
  $('h1,h2,h3,h4,a[href]').each((_, e) => {
    const no = $(e)
    if (!no.is('a')) {
      const nivel = Number(e.tagName.slice(1)) - 1
      titulos.length = nivel
      titulos[nivel] = limpar(no.text()).slice(0, 60)
      return
    }
    const texto = textoDoLink(no)
    if (texto.length < 4) return
    // O título da própria chamada (quando o link está dentro dele) não é seção.
    const secao = titulos.filter((t) => t && t !== texto && !texto.startsWith(t)).join(' › ')
    links.adicionar(secao ? `${texto} [seção: ${secao}]` : texto, no.attr('href'))
  })
  return links.lista()
}

/** Título e começo do texto da página: ajudam a IA a dizer se ela é uma lista, um edital ou outra coisa. */
export function resumoDaPagina(conteudo: string): { titulo: string; trecho: string } {
  if (pareceFeed(conteudo)) {
    const $ = load(conteudo, { xmlMode: true })
    return { titulo: limpar($('channel > title, feed > title').first().text()), trecho: '(feed RSS/Atom)' }
  }
  const $ = load(conteudo)
  const titulo = limpar($('title').first().text() || $('h1').first().text())
  $('nav,header,footer,script,style,noscript').remove()
  return { titulo, trecho: limpar($('main').text() || $('body').text()).slice(0, 1500) }
}

/** Links candidatos de uma página ou feed (o formato é reconhecido pelo conteúdo). */
export function listarLinks(conteudo: string, base: string): LinkCandidato[] {
  const links = pareceFeed(conteudo) ? linksDoFeed(conteudo, base) : linksDaPagina(conteudo, base)
  const mesmaPagina = new URL(base)
  mesmaPagina.hash = ''
  return links.filter((l) => l.url !== mesmaPagina.href).slice(0, MAXIMO_CANDIDATOS)
}

// ---- Dados JSON (APIs que a página usa) ----

type Objeto = Record<string, unknown>
const ehObjeto = (v: unknown): v is Objeto => typeof v === 'object' && v !== null && !Array.isArray(v)

const CAMPOS_TITULO = ['titulo', 'title', 'nome', 'name', 'assunto', 'descricaoResumida']
const CAMPOS_URL = ['url', 'link', 'href', 'permalink', 'urlDetalhe', 'url_detalhe']
const CAMPOS_TEXTO = ['descricaoRawText', 'descricao', 'description', 'resumo', 'content', 'excerpt']

// Texto de um valor que pode vir como string, { rendered } (WordPress) ou { name } (listas do Liferay).
function texto(valor: unknown): string {
  if (typeof valor === 'string') return valor
  if (ehObjeto(valor)) return texto(valor.rendered ?? valor.name ?? valor.label ?? valor.key ?? '')
  return ''
}

const semHtml = (valor: string) => limpar(load(`<div>${valor}</div>`)('div').text())

// Maior lista de objetos dentro da resposta (a resposta pode ser a lista ou ter a lista em `items`, `data`…).
function maiorLista(valor: unknown, profundidade = 0): Objeto[] {
  if (Array.isArray(valor)) return valor.filter(ehObjeto)
  if (!ehObjeto(valor) || profundidade > 3) return []
  let melhor: Objeto[] = []
  for (const filho of Object.values(valor)) {
    const lista = maiorLista(filho, profundidade + 1)
    if (lista.length > melhor.length) melhor = lista
  }
  return melhor
}

function primeiro(item: Objeto, campos: string[]): string {
  for (const campo of campos) {
    const valor = semHtml(texto(item[campo]))
    if (valor) return valor
  }
  return ''
}

// Campos curtos do item (situação, prazos, datas…) para a IA julgar se a chamada está aberta.
function detalheDoItem(item: Objeto): string {
  const partes: string[] = []
  for (const [chave, valor] of Object.entries(item)) {
    if (CAMPOS_TITULO.includes(chave) || CAMPOS_TEXTO.includes(chave) || chave === 'actions') continue
    const conteudo = texto(valor)
    if (!conteudo || conteudo.length > 40) continue
    if (/situa|status|prazo|data|vigen|inicio|fim|encerr|abert/i.test(chave)) partes.push(`${chave}: ${conteudo}`)
  }
  return partes.slice(0, 6).join('; ')
}

/** Itens de uma resposta JSON que têm título: cada um é uma chamada candidata. */
export function candidatosDoJson(dados: unknown, base: string): LinkCandidato[] {
  const candidatos: LinkCandidato[] = []
  for (const item of maiorLista(dados)) {
    const titulo = primeiro(item, CAMPOS_TITULO)
    if (!titulo) continue
    const acoes = ehObjeto(item.actions) && ehObjeto(item.actions.get) ? texto(item.actions.get.href) : ''
    let url = primeiro(item, CAMPOS_URL) || acoes
    try {
      url = new URL(url || `#${String(item.id ?? candidatos.length)}`, base).href
    } catch {
      continue
    }
    candidatos.push({
      titulo: titulo.slice(0, 200),
      url,
      detalhe: detalheDoItem(item) || undefined,
      texto: [titulo, primeiro(item, CAMPOS_TEXTO)].filter(Boolean).join('\n\n') || undefined,
    })
    if (candidatos.length >= MAXIMO_CANDIDATOS) break
  }
  return candidatos
}
