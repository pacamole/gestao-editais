import { CAMPOS_EDITAVEIS, type CampoEditavel } from '../../../shared/camposEditaveis.js'
import { CAMPOS_EDITAL } from '../../../shared/rotulos.js'
import { normalizarValor, type ValorCampo } from '../../../shared/valoresCampo.js'

// Tudo o que o catálogo permite preencher é extraído.
export const CAMPOS_PARA_EXTRAIR = CAMPOS_EDITAVEIS

export type CampoEditalExtraido = CampoEditavel
export type ValorCampoEditalExtraido = ValorCampo
export type ResultadoExtracaoEdital = {
  campos: Partial<Record<CampoEditalExtraido, ValorCampoEditalExtraido>>
  evidencias: Partial<Record<CampoEditalExtraido, { trecho: string; pagina: number | null }>>
}

export const CONSULTAS_EXTRACAO = [
  'órgão financiador instituição promotora número edital chamada modalidade',
  'data de publicação cronograma calendário prazo inscrição submissão propostas resultado',
  'valor total disponível orçamento recursos financeiros valor máximo limite por projeto',
  'contrapartida percentual exigido aporte financeiro',
  'público-alvo proponentes beneficiários quem pode participar',
  'CNAE atividades econômicas aceitas',
  'porte da empresa microempresa pequena empresa porte aceito',
  'abrangência geográfica estados municípios região',
  'áreas temáticas linhas de apoio objetivo objeto da chamada',
  'natureza jurídica sociedade empresária tipo de pessoa jurídica elegível',
  'tempo mínimo de constituição fundação anos de existência da empresa',
  'receita bruta anual faturamento mínimo máximo',
  'instituição científica tecnológica ICT parceria cooperação',
  'certidões negativas regularidade fiscal documentos de habilitação',
  'número de propostas por proponente submissão múltipla',
]
export const MAXIMO_CARACTERES_EXTRACAO = 12_000

function normalizarEvidencia(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim()
}

// O modelo costuma juntar trechos com "..."; cada parte precisa estar literalmente na mesma página.
function contemEvidencia(texto: string, partes: string[]): boolean {
  const normalizado = normalizarEvidencia(texto)
  return partes.every((parte) => normalizado.includes(parte))
}

function encontrarEvidencia(texto: string, evidencia: string): number | null | undefined {
  const partes = evidencia.split(/\.{3}|…/).map(normalizarEvidencia).filter((parte) => parte.length >= 3)
  if (!partes.length) return undefined
  const paginas = [...texto.matchAll(/(?:^|\n)\[Página\s+(\d+)\]\n([\s\S]*?)(?=\n\n\[(?:Página\s+\d+|Fonte URL:)[^\]]*\]|$)/g)]
  for (const pagina of paginas) {
    if (contemEvidencia(pagina[2] ?? '', partes)) return Number(pagina[1])
  }
  const paginasWeb = [...texto.matchAll(/(?:^|\n)\[Fonte URL:\s*[^\]]+\]\n([\s\S]*?)(?=\n\n\[(?:Página\s+\d+|Fonte URL:)[^\]]*\]|$)/g)]
  if (paginasWeb.some((pagina) => contemEvidencia(pagina[1] ?? '', partes))) return null
  if (!paginas.length && !paginasWeb.length) return contemEvidencia(texto, partes) ? null : undefined
  return undefined
}

function normalizarValorCampo(campo: CampoEditalExtraido, valor: unknown): ValorCampoEditalExtraido | undefined {
  if (valor === null) return null
  const resultado = normalizarValor(CAMPOS_EDITAL[campo].tipo, valor)
  return resultado.ok ? resultado.valor : undefined
}

// Converte o JSON devolvido pelo modelo em campos válidos. Descarta o que não tiver evidência literal no texto.
export function interpretarExtracao(dados: Record<string, unknown>, textoEdital: string): ResultadoExtracaoEdital {
  const campos: ResultadoExtracaoEdital['campos'] = {}
  const evidencias: ResultadoExtracaoEdital['evidencias'] = {}
  for (const campo of CAMPOS_PARA_EXTRAIR) {
    const item = dados[campo]
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const registro = item as Record<string, unknown>
    const valor = normalizarValorCampo(campo, registro.valor)
    if (valor === undefined || valor === null) continue
    const trecho = typeof registro.evidencia === 'string' ? registro.evidencia.trim() : ''
    const pagina = encontrarEvidencia(textoEdital, trecho)
    if (pagina === undefined) continue
    campos[campo] = valor
    evidencias[campo] = { trecho, pagina }
  }
  return { campos, evidencias }
}
