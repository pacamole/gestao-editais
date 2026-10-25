import { load } from 'cheerio'
import type { PortalColeta, Publicacao } from './PortalColeta.js'
import { acumulador } from './publicacoes.js'

export class PortalCnpq implements PortalColeta {
  readonly nome = 'CNPq'
  readonly urlPadrao = 'https://www.gov.br/cnpq/pt-br/chamadas/Busca_abertas'

  listarPublicacoes(html: string, base: string): Publicacao[] {
    const $ = load(html)
    const publicacoes = acumulador(base)
    $('#content-core .tileHeadline a, #content-core .summary a').each((_, e) =>
      publicacoes.adicionar($(e).text(), $(e).attr('href')),
    )
    return publicacoes.lista()
  }

  // "Chamada CNPq nº 33/2026 - …" → "33/2026"
  numeroDaChamada(titulo: string): string | null {
    return titulo.match(/(?:n[º°o.]|número)\s*(\d+\s*\/\s*\d{4})/i)?.[1]?.replace(/\s/g, '') ?? null
  }
}
