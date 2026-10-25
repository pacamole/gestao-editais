export type Publicacao = { titulo: string; url: string }

// Um portal de fomento que o sistema sabe ler. Portal novo = uma classe nova que implementa isto
// e uma linha em portais/index.ts; o ColetaServico não muda.
export interface PortalColeta {
  /** Mesmo nome da fonte cadastrada. */
  readonly nome: string
  /** Página de chamadas abertas, usada quando a fonte não tem outro endereço. */
  readonly urlPadrao: string
  /** Chamadas abertas listadas no HTML da página do portal. */
  listarPublicacoes(html: string, base: string): Publicacao[]
  /** Número da chamada (ex.: "33/2026") quando o título o traz sem ambiguidade; senão, null. */
  numeroDaChamada(titulo: string): string | null
}
