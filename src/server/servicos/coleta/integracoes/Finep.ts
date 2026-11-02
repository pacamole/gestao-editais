import type { Edital } from '../../../dominio/entidades.js'
import { baixar } from '../../../integracoes/http.js'
import { hoje } from '../../../../shared/datas.js'
import type { ChamadaColetada, IntegracaoFonte } from './IntegracaoFonte.js'

// Referência completa da API (endpoints, campos, armadilhas): docs/API-FINEP.md.
const SITE = 'https://www.finep.gov.br'
const API = `${SITE}/o/c/chamadapublicas?pageSize=500&sort=dataDePublicacao:desc&nestedFields=documentos`
const PAGINA_DE_CHAMADAS = `${SITE}/oportunidades`

type Lista = { key?: string; name?: string } | null | undefined

type DocumentoFinep = {
  legenda?: string
  dataDePublicacao?: string
  documentoProprietario?: { name?: string; link?: { href?: string } }
}

type ChamadaFinep = {
  id: number
  titulo: string
  descricaoRawText?: string
  situacao?: Lista
  prazoProposto?: string | null
  vigenciaFim?: string | null
  dataDePublicacao?: string | null
  publicoAlvo?: Lista[]
  tipoDeOportunidade?: Lista
  contrapartida?: Lista
  regiao?: Lista
  documentos?: DocumentoFinep[]
}

// Faixas de receita do campo publicoAlvo (empresa1 a empresa5), em reais.
const FAIXAS_RECEITA: Record<string, [number, number | null]> = {
  empresa1: [0, 4_800_000],
  empresa2: [4_800_000, 16_000_000],
  empresa3: [16_000_000, 90_000_000],
  empresa4: [90_000_000, 300_000_000],
  empresa5: [300_000_000, null],
}

const REGIOES: Record<string, string[]> = {
  todoBrasil: [], // sem restrição
  norte: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
  nordeste: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  centroOeste: ['DF', 'GO', 'MT', 'MS'],
  sudeste: ['ES', 'MG', 'RJ', 'SP'],
  sul: ['PR', 'RS', 'SC'],
}

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

// Sem prazo nem vigência, só a data de publicação diz se a chamada ainda é atual (há "abertas" de 2015).
const MESES_SEM_PRAZO = 12

/**
 * Aberta = prazo futuro. Sem prazo, a situação "aberta" (que a FINEP não atualiza) só vale com vigência futura
 * ou, sem vigência, publicada nos últimos 12 meses.
 */
export function chamadaAberta(c: ChamadaFinep, agora = new Date()): boolean {
  if (c.prazoProposto) return new Date(c.prazoProposto) > agora
  if (c.situacao?.key !== 'aberta') return false
  if (c.vigenciaFim) return new Date(c.vigenciaFim) > agora
  if (!c.dataDePublicacao) return false
  const limite = new Date(agora)
  limite.setMonth(limite.getMonth() - MESES_SEM_PRAZO)
  return new Date(c.dataDePublicacao) > limite
}

/** O edital entre os documentos: rerratificado → Edital → Regulamento; o mais recente em cada nível. */
export function documentoDoEdital(documentos: DocumentoFinep[] = []): DocumentoFinep | undefined {
  const comArquivo = documentos.filter((d) => d.documentoProprietario?.link?.href)
  const recente = (lista: DocumentoFinep[]) =>
    [...lista].sort((a, b) => (b.dataDePublicacao ?? '').localeCompare(a.dataDePublicacao ?? ''))[0]
  const legenda = (d: DocumentoFinep) => normalizar(d.legenda ?? '')
  const niveis: ((l: string) => boolean)[] = [
    (l) => l.includes('edital rerratificado'),
    (l) => l.startsWith('edital'),
    (l) => l.startsWith('regulamento'),
  ]
  for (const nivel of niveis) {
    const achados = comArquivo.filter((d) => nivel(legenda(d)))
    if (achados.length) return recente(achados)
  }
  return undefined
}

// Data civil de Brasília (a API manda instantes em UTC: 17:00Z é 14:00 em Brasília).
const dataCivil = (instante: string | null | undefined) => (instante ? hoje(new Date(instante)) : undefined)

/** Campos que a API já informa; a IA não os refaz. Só entra o que veio preenchido. */
export function camposEstruturados(c: ChamadaFinep): Partial<Edital> {
  const campos: Partial<Edital> = {}
  const prazo = dataCivil(c.prazoProposto)
  if (prazo) campos.prazo_inscricao = prazo
  const publicacao = dataCivil(c.dataDePublicacao)
  if (publicacao) campos.data_publicacao = publicacao

  const tipo = c.tipoDeOportunidade?.key
  if (tipo === 'naoReembolsavel') campos.modalidade = 'SUBVENCAO'
  else if (tipo === 'apoioInstitucional') campos.modalidade = 'OUTRO'

  const contrapartida = c.contrapartida?.key
  if (contrapartida === 'financeira' || contrapartida === 'naoFinanceira') campos.exige_contrapartida = true
  else if (contrapartida === 'semContrapartida') campos.exige_contrapartida = false

  const regiao = c.regiao?.key
  if (regiao && regiao in REGIOES) campos.abrangencia_geografica = REGIOES[regiao]!

  const publico = (c.publicoAlvo ?? []).filter((p): p is { key: string; name?: string } => Boolean(p?.key))
  if (publico.length) campos.publico_alvo = publico.map((p) => p.name || p.key)
  const faixas = publico.map((p) => FAIXAS_RECEITA[p.key]).filter((f): f is [number, number | null] => Boolean(f))
  if (faixas.length) {
    campos.faturamento_minimo = Math.min(...faixas.map((f) => f[0]))
    campos.faturamento_maximo = faixas.some((f) => f[1] === null) ? null : Math.max(...faixas.map((f) => f[1]!))
  }
  return campos
}

/** FINEP: API pública do site (Liferay), com os PDFs dos editais. */
export class Finep implements IntegracaoFonte {
  readonly codigo = 'FINEP' as const
  readonly nome = 'FINEP'
  readonly endereco = PAGINA_DE_CHAMADAS

  constructor(private readonly baixarArquivo = baixar) {}

  async listarChamadas(): Promise<ChamadaColetada[]> {
    const resposta = JSON.parse(Buffer.from(await this.baixarArquivo(API)).toString('utf8')) as { items?: ChamadaFinep[] }
    if (!Array.isArray(resposta.items)) throw new Error('A API da FINEP respondeu num formato inesperado (sem "items"). Veja docs/API-FINEP.md.')

    return resposta.items.filter((c) => chamadaAberta(c)).map((c) => {
      const documento = documentoDoEdital(c.documentos)
      return {
        idExterno: String(c.id),
        titulo: c.titulo,
        urlOriginal: PAGINA_DE_CHAMADAS,
        urlDocumento: documento ? new URL(documento.documentoProprietario!.link!.href!, SITE).href : null,
        textoAlternativo: [c.titulo, c.descricaoRawText].filter(Boolean).join('\n\n'),
        camposEstruturados: camposEstruturados(c),
        procurarPdfNaPagina: false,
      }
    })
  }
}
