// O texto de um edital marca a origem de cada parte: "[Página N]" (PDF) e "[Fonte URL: …]" (página lida).
// Quem escreve (integrações) e quem lê (busca de trechos, evidências, releitura) usa só estas funções.

export type SecaoTexto = { pagina: number | null; url: string | null; conteudo: string }

// Um marcador começa o texto ou vem depois de uma linha em branco, e ocupa a linha inteira.
const MARCADOR = /(?<=^|\n\n)\[(?:Página\s+(\d+)|Fonte URL:\s*([^\]]+))\]\n/g

// Documento escaneado: vale para o edital, não para uma leitura. A IA ler o resto não resolve.
export const AVISO_PAGINAS_SEM_TEXTO = 'Requer leitura manual: a maior parte das páginas não tem camada de texto.'

export const marcadorDePagina = (pagina: number) => `[Página ${pagina}]`
export const marcadorDeUrl = (url: string) => `[Fonte URL: ${url}]`

/** Cabeçalho da seção como aparece no texto ('' quando a parte não tem marcador). */
export function cabecalhoDaSecao(secao: SecaoTexto): string {
  if (secao.pagina != null) return marcadorDePagina(secao.pagina)
  return secao.url ? marcadorDeUrl(secao.url) : ''
}

/** Divide o texto pelas marcas de origem. Texto sem marcas vira uma seção só. */
export function secoesDoTexto(texto: string): SecaoTexto[] {
  const marcadores = [...texto.matchAll(MARCADOR)]
  const secoes: SecaoTexto[] = []
  const antes = texto.slice(0, marcadores[0]?.index ?? texto.length).trim()
  if (antes) secoes.push({ pagina: null, url: null, conteudo: antes })
  marcadores.forEach((marcador, i) => {
    const fim = marcadores[i + 1]?.index ?? texto.length
    secoes.push({
      pagina: marcador[1] ? Number(marcador[1]) : null,
      url: marcador[2]?.trim() ?? null,
      conteudo: texto.slice(marcador.index! + marcador[0].length, fim).trim(),
    })
  })
  return secoes
}

/** Remove o conteúdo de páginas lidas antes, para não duplicar ao reler. */
export function semPaginasLidas(texto: string): string {
  return secoesDoTexto(texto)
    .filter((secao) => !secao.url)
    .map((secao) => [cabecalhoDaSecao(secao), secao.conteudo].filter(Boolean).join('\n'))
    .join('\n\n')
}
