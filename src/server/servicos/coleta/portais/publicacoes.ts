import type { Publicacao } from './PortalColeta.js'

export const limpar = (texto: string) => texto.replace(/\s+/g, ' ').trim()

// Junta as chamadas encontradas na página, sem repetir endereços e só com links http(s).
export function acumulador(base: string) {
  const publicacoes = new Map<string, Publicacao>()
  return {
    adicionar(titulo: string, href: string | undefined) {
      if (!href || !titulo) return
      const url = new URL(href, base)
      if (!['https:', 'http:'].includes(url.protocol)) return
      url.hash = ''
      publicacoes.set(url.href, { titulo: limpar(titulo), url: url.href })
    },
    lista: (): Publicacao[] => [...publicacoes.values()],
  }
}
