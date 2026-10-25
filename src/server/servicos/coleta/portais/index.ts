import type { PortalColeta } from './PortalColeta.js'
import { PortalCnpq } from './PortalCnpq.js'
import { PortalEmbrapii } from './PortalEmbrapii.js'
import { PortalFinep } from './PortalFinep.js'

// Portais que o sistema sabe ler sozinho. Para ensinar um portal novo, crie a classe e inclua aqui.
export const PORTAIS: readonly PortalColeta[] = [new PortalFinep(), new PortalCnpq(), new PortalEmbrapii()]

export function portalDaFonte(nome: string, portais: readonly PortalColeta[] = PORTAIS): PortalColeta | undefined {
  return portais.find((portal) => portal.nome === nome)
}

export type { PortalColeta, Publicacao } from './PortalColeta.js'
export { documentoPrincipal } from './documentoPrincipal.js'
