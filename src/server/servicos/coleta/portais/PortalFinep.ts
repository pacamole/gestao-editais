import { load } from 'cheerio'
import type { PortalColeta, Publicacao } from './PortalColeta.js'
import { acumulador, limpar } from './publicacoes.js'

export class PortalFinep implements PortalColeta {
  readonly nome = 'FINEP'
  readonly urlPadrao = 'https://legacy.finep.gov.br/component/chamadas_publicas/chamadaspublicas'

  listarPublicacoes(html: string, base: string): Publicacao[] {
    const $ = load(html)
    const publicacoes = acumulador(base)
    // Somente o bloco "Abertas"; não inclui chamadas encerradas nem resultados.
    const cabecalho = $('h2,h3')
      .filter((_, e) => limpar($(e).text()).toLowerCase() === 'abertas')
      .first()
    cabecalho
      .parent()
      .nextUntil('.tit_sep')
      .find('a[href]')
      .each((_, e) => {
        const a = $(e)
        if (/chamadapublica\/\d+/.test(a.attr('href') ?? '')) publicacoes.adicionar(a.text(), a.attr('href'))
      })
    return publicacoes.lista()
  }

  numeroDaChamada(): string | null {
    return null
  }
}
