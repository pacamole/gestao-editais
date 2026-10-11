import { load } from 'cheerio'
import type { Portal } from './fontes.js'

export type Publicacao = { titulo: string; url: string }
const limpar = (texto: string) => texto.replace(/\s+/g, ' ').trim()
export function listarPublicacoes(portal: Portal, html: string, base: string): Publicacao[] {
  const $ = load(html)
  const publicacoes = new Map<string, Publicacao>()
  const adicionar = (titulo: string, href: string | undefined) => {
    if (!href || !titulo) return
    const url = new URL(href, base)
    if (!['https:', 'http:'].includes(url.protocol)) return
    url.hash = ''
    publicacoes.set(url.href, { titulo: limpar(titulo), url: url.href })
  }
  if (portal === 'FINEP') {
    // Somente o bloco Abertas; não inclui chamadas encerradas nem resultados.
    const cabecalho = $('h2,h3').filter((_, e) => limpar($(e).text()).toLowerCase() === 'abertas').first()
    const bloco = cabecalho.parent().nextUntil('.tit_sep')
    bloco.find('a[href]').each((_, e) => {
      const a = $(e)
      if (/chamadapublica\/\d+/.test(a.attr('href') ?? '')) adicionar(a.text(), a.attr('href'))
    })
  } else if (portal === 'CNPq') {
    $('#content-core .tileHeadline a, #content-core .summary a').each((_, e) => adicionar($(e).text(), $(e).attr('href')))
  } else {
    $('.single-chamada-publica').each((_, e) => {
      const titulo = $(e).find('.title-single-chamada-publica').text()
      if (!/resultado|encerrad/i.test(titulo)) adicionar(titulo, $(e).find('a[href]').attr('href'))
    })
  }
  return [...publicacoes.values()]
}

// Seleciona o edital principal, evitando tratar anexos/FAQ/resultados como novos editais.
export function documentoPrincipal(html: string, base: string): string | undefined {
  const $ = load(html)
  $('nav,header,footer,script,style').remove()
  const candidatos: { url: string; peso: number; ordem: number }[] = []
  $('a[href]').each((ordem, e) => {
    const a = $(e)
    const href = a.attr('href') ?? ''
    if (!/\.pdf(?:[?#]|$)/i.test(href)) return
    const texto = limpar(a.text() + ' ' + a.closest('tr,.single-item-listagem,li').text() + ' ' + href)
    if (/anexo|resultado|faq|perguntas|apresenta|tutorial|formul[aá]rio|modelo|manual|planilha|instru[çc][oõ]es|errata/i.test(texto)) return
    candidatos.push({ url: new URL(href, base).href, peso: /retific|revis|vers[aã]o|atualiz/i.test(texto) ? 2 : /edital|chamada|regulamento/i.test(texto) ? 1 : 0, ordem })
  })
  return candidatos.sort((a, b) => b.peso - a.peso || a.ordem - b.ordem)[0]?.url
}
