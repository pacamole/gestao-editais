import { createHash } from 'node:crypto'

type Trecho = {
  texto: string
  termos: string[]
  frequencias: Map<string, number>
}

type IndiceEdital = {
  assinatura: string
  trechos: Trecho[]
  frequenciaDocumentos: Map<string, number>
  mediaTamanho: number
}

export type BuscaEdital = {
  trechos: string
  relevante: boolean
}

const MAXIMO_EDITAIS_CACHE = 20
const MAXIMO_CARACTERES_TRECHOS = 9_000
const TAMANHO_TRECHO = 1_400
const SOBREPOSICAO = 180
const PALAVRAS_COMUNS = new Set([
  'a', 'as', 'ao', 'aos', 'com', 'como', 'da', 'das', 'de', 'do', 'dos',
  'e', 'em', 'entre', 'o', 'os', 'para', 'por', 'qual', 'quais', 'que',
  'se', 'sobre', 'um', 'uma', 'uns', 'umas',
])
const cacheIndices = new Map<string, IndiceEdital>()

function tokenizar(texto: string): string[] {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .match(/[\p{L}\p{N}]{3,}/gu)
    ?.filter((termo) => !/^\d+$/.test(termo) && !PALAVRAS_COMUNS.has(termo)) ?? []
}

function dividirEmTrechos(texto: string): string[] {
  const paginas = texto.split(/(?=\[(?:Página\s+\d+|Fonte URL:)[^\]]*\])/)
  const trechos: string[] = []

  for (const pagina of paginas) {
    let restante = pagina.trim()
    while (restante.length > TAMANHO_TRECHO) {
      let fim = restante.lastIndexOf(' ', TAMANHO_TRECHO)
      if (fim < TAMANHO_TRECHO * 0.6) fim = TAMANHO_TRECHO
      trechos.push(restante.slice(0, fim).trim())
      restante = restante.slice(Math.max(0, fim - SOBREPOSICAO)).trim()
    }
    if (restante) trechos.push(restante)
  }

  return trechos
}

function criarIndice(texto: string, assinatura: string): IndiceEdital {
  const trechos = dividirEmTrechos(texto).map((conteudo) => {
    const termos = tokenizar(conteudo)
    const frequencias = new Map<string, number>()
    for (const termo of termos) frequencias.set(termo, (frequencias.get(termo) ?? 0) + 1)
    return { texto: conteudo, termos, frequencias }
  })
  const frequenciaDocumentos = new Map<string, number>()
  for (const trecho of trechos) {
    for (const termo of trecho.frequencias.keys()) {
      frequenciaDocumentos.set(termo, (frequenciaDocumentos.get(termo) ?? 0) + 1)
    }
  }

  return {
    assinatura,
    trechos,
    frequenciaDocumentos,
    mediaTamanho: trechos.reduce((total, trecho) => total + trecho.termos.length, 0) / Math.max(1, trechos.length),
  }
}

function obterIndice(editalId: string, texto: string, versao?: string): IndiceEdital {
  const assinatura = versao ?? createHash('sha256').update(texto).digest('hex')
  let indice = cacheIndices.get(editalId)
  if (indice?.assinatura !== assinatura) {
    indice = criarIndice(texto, assinatura)
    cacheIndices.delete(editalId)
    cacheIndices.set(editalId, indice)
    if (cacheIndices.size > MAXIMO_EDITAIS_CACHE) {
      const maisAntigo = cacheIndices.keys().next().value
      if (maisAntigo) cacheIndices.delete(maisAntigo)
    }
  } else {
    cacheIndices.delete(editalId)
    cacheIndices.set(editalId, indice)
  }
  return indice
}

export function buscarTrechosEdital(editalId: string, texto: string, pergunta: string, versao?: string): BuscaEdital {
  const termosPergunta = [...new Set(tokenizar(pergunta))]
  if (!termosPergunta.length || /\d+\s*[+\-*/×÷]\s*\d+/.test(pergunta)) {
    return { trechos: '', relevante: false }
  }

  const indice = obterIndice(editalId, texto, versao)
  const totalTrechos = indice.trechos.length
  const classificados = indice.trechos.map((trecho, ordem) => {
    let score = 0
    let termosCorrespondentes = 0
    for (const termo of termosPergunta) {
      const frequencia = trecho.frequencias.get(termo) ?? 0
      if (!frequencia) continue
      termosCorrespondentes++
      const documentosComTermo = indice.frequenciaDocumentos.get(termo) ?? 0
      const idf = Math.log(1 + (totalTrechos - documentosComTermo + 0.5) / (documentosComTermo + 0.5))
      const tamanhoNormalizado = trecho.termos.length / Math.max(1, indice.mediaTamanho)
      score += idf * (frequencia * 2.2) / (frequencia + 1.2 * (0.25 + 0.75 * tamanhoNormalizado))
    }
    return { ...trecho, ordem, score, termosCorrespondentes }
  })
  const relevantes = classificados
    .filter((trecho) => trecho.score > 0)
    .sort((a, b) => b.score - a.score || a.ordem - b.ordem)

  if (!relevantes.length) return { trechos: '', relevante: false }

  const selecionados: typeof relevantes = []
  let caracteres = 0
  for (const trecho of relevantes) {
    const acrescimo = trecho.texto.length + (selecionados.length ? 2 : 0)
    if (caracteres + acrescimo > MAXIMO_CARACTERES_TRECHOS) continue
    selecionados.push(trecho)
    caracteres += acrescimo
    if (selecionados.length >= 6) break
  }

  return {
    trechos: selecionados.sort((a, b) => a.ordem - b.ordem).map((trecho) => trecho.texto).join('\n\n'),
    relevante: true,
  }
}
