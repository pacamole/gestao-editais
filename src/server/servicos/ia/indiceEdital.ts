import { createHash } from 'node:crypto'
import { cabecalhoDaSecao, secoesDoTexto } from '../../dominio/textoEdital.js'

// Busca por palavras (BM25) nos trechos do edital: usada quando o documento não cabe inteiro no modelo.

export type TrechoEdital = { ordem: number; texto: string }

type Trecho = TrechoEdital & {
  termos: string[]
  frequencias: Map<string, number>
}

type IndiceEdital = {
  assinatura: string
  trechos: Trecho[]
  frequenciaDocumentos: Map<string, number>
  mediaTamanho: number
}

const MAXIMO_EDITAIS_CACHE = 20
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
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR')
    .match(/[\p{L}\p{N}]{3,}/gu)
    ?.filter((termo) => !/^\d+$/.test(termo) && !PALAVRAS_COMUNS.has(termo)) ?? []
}

// Cada trecho leva o marcador da sua página, para o modelo poder citar a origem.
function dividirEmTrechos(texto: string): string[] {
  const trechos: string[] = []
  for (const secao of secoesDoTexto(texto)) {
    const cabecalho = cabecalhoDaSecao(secao)
    const comCabecalho = (parte: string) => (cabecalho ? `${cabecalho}\n${parte}` : parte)
    let restante = secao.conteudo
    while (restante.length > TAMANHO_TRECHO) {
      let fim = restante.lastIndexOf(' ', TAMANHO_TRECHO)
      if (fim < TAMANHO_TRECHO * 0.6) fim = TAMANHO_TRECHO
      trechos.push(comCabecalho(restante.slice(0, fim).trim()))
      restante = restante.slice(Math.max(0, fim - SOBREPOSICAO)).trim()
    }
    if (restante) trechos.push(comCabecalho(restante))
  }
  return trechos
}

function criarIndice(texto: string, assinatura: string): IndiceEdital {
  const trechos = dividirEmTrechos(texto).map((conteudo, ordem) => {
    const termos = tokenizar(conteudo)
    const frequencias = new Map<string, number>()
    for (const termo of termos) frequencias.set(termo, (frequencias.get(termo) ?? 0) + 1)
    return { ordem, texto: conteudo, termos, frequencias }
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

function obterIndice(editalId: string, texto: string): IndiceEdital {
  const assinatura = createHash('sha256').update(texto).digest('hex')
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

const paraTrecho = ({ ordem, texto }: Trecho): TrechoEdital => ({ ordem, texto })

/** Todos os trechos do edital, na ordem do documento. */
export function trechosDoEdital(editalId: string, texto: string): TrechoEdital[] {
  return obterIndice(editalId, texto).trechos.map(paraTrecho)
}

/** Trechos que têm algum termo da consulta, do mais relevante para o menos. */
export function buscarTrechos(editalId: string, texto: string, consulta: string): TrechoEdital[] {
  const termosConsulta = [...new Set(tokenizar(consulta))]
  if (!termosConsulta.length) return []

  const indice = obterIndice(editalId, texto)
  const totalTrechos = indice.trechos.length
  return indice.trechos
    .map((trecho) => {
      let score = 0
      for (const termo of termosConsulta) {
        const frequencia = trecho.frequencias.get(termo) ?? 0
        if (!frequencia) continue
        const documentosComTermo = indice.frequenciaDocumentos.get(termo) ?? 0
        const idf = Math.log(1 + (totalTrechos - documentosComTermo + 0.5) / (documentosComTermo + 0.5))
        const tamanhoNormalizado = trecho.termos.length / Math.max(1, indice.mediaTamanho)
        score += idf * (frequencia * 2.2) / (frequencia + 1.2 * (0.25 + 0.75 * tamanhoNormalizado))
      }
      return { trecho, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.trecho.ordem - b.trecho.ordem)
    .map(({ trecho }) => paraTrecho(trecho))
}

/** Junta os trechos escolhidos na ordem em que aparecem no documento. */
export function juntarTrechos(trechos: Iterable<TrechoEdital>): string {
  return [...trechos].sort((a, b) => a.ordem - b.ordem).map((trecho) => trecho.texto).join('\n\n')
}
