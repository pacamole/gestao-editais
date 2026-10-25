import { load } from 'cheerio'
import type { PortalColeta, Publicacao } from './PortalColeta.js'
import { acumulador } from './publicacoes.js'

export class PortalEmbrapii implements PortalColeta {
  readonly nome = 'Embrapii'
  readonly urlPadrao = 'https://embrapii.org.br/transparencia/#chamadas'

  listarPublicacoes(html: string, base: string): Publicacao[] {
    const $ = load(html)
    const publicacoes = acumulador(base)
    $('.single-chamada-publica').each((_, e) => {
      const titulo = $(e).find('.title-single-chamada-publica').text()
      if (!/resultado|encerrad/i.test(titulo)) publicacoes.adicionar(titulo, $(e).find('a[href]').attr('href'))
    })
    return publicacoes.lista()
  }

  // A Embrapii repete número/ano em séries distintas (Unidades, Centros e chamadas internas):
  // não inferir uma identidade ambígua; aguardar a extração estruturada.
  numeroDaChamada(): string | null {
    return null
  }
}
