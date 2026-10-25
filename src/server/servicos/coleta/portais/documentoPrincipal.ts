import { load } from 'cheerio'
import { limpar } from './publicacoes.js'

const IGNORADOS = /anexo|resultado|faq|perguntas|apresenta|tutorial|formul[aá]rio|modelo|manual|planilha|instru[çc][oõ]es|errata/i

// Seleciona o edital principal da página de uma chamada, evitando tratar anexos/FAQ/resultados como novos editais.
export function documentoPrincipal(html: string, base: string): string | undefined {
  const $ = load(html)
  $('nav,header,footer,script,style').remove()
  const candidatos: { url: string; peso: number; ordem: number }[] = []
  $('a[href]').each((ordem, e) => {
    const a = $(e)
    const href = a.attr('href') ?? ''
    if (!/\.pdf(?:[?#]|$)/i.test(href)) return
    const texto = limpar(a.text() + ' ' + a.closest('tr,.single-item-listagem,li').text() + ' ' + href)
    if (IGNORADOS.test(texto)) return
    candidatos.push({
      url: new URL(href, base).href,
      peso: /retific|revis|vers[aã]o|atualiz/i.test(texto) ? 2 : /edital|chamada|regulamento/i.test(texto) ? 1 : 0,
      ordem,
    })
  })
  return candidatos.sort((a, b) => b.peso - a.peso || a.ordem - b.ordem)[0]?.url
}
