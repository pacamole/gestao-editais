import type { PerfilEmpresa } from './entidades.js'

// Termos que, sozinhos, indicam chamada que não serve a uma empresa (a lista é editável em Configurações).
export const TERMOS_EXCLUDENTES_PADRAO: readonly string[] = [
  'bolsa',
  'bolsas',
  'pessoa física',
  'graduação',
  'iniciação científica',
  'pós-graduação',
  'mestrado',
  'doutorado',
]

// Quanto do começo do documento entra na conferência (título + abertura do edital).
const TRECHO_INICIAL = 2000

export type ResultadoRelevancia = { relevante: true } | { relevante: false; motivo: string }

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const contem = (texto: string, termo: string) => {
  const t = normalizar(termo).trim()
  if (!t) return false
  const escapado = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![a-z0-9])${escapado}(?![a-z0-9])`).test(texto)
}

/**
 * Decide se vale gastar IA num edital que chegou sozinho. Fica de fora só se o título ou a abertura traz um termo
 * excludente e nenhuma palavra-chave ou área de atuação do perfil aparece no título: na dúvida, segue para análise.
 */
export function avaliarRelevancia(
  edital: { titulo: string; texto_extraido: string | null },
  perfil: Pick<PerfilEmpresa, 'palavras_chave' | 'areas_atuacao'>,
  termosExcludentes: readonly string[],
): ResultadoRelevancia {
  const titulo = normalizar(edital.titulo)
  const abertura = normalizar(`${edital.titulo}\n${(edital.texto_extraido ?? '').slice(0, TRECHO_INICIAL)}`)

  const excludente = termosExcludentes.find((termo) => contem(abertura, termo))
  if (!excludente) return { relevante: true }

  const doPerfil = [...perfil.palavras_chave, ...perfil.areas_atuacao].some((termo) => contem(titulo, termo))
  if (doPerfil) return { relevante: true }

  return {
    relevante: false,
    motivo: `Fora do perfil: o edital cita "${excludente}" e nada do perfil da empresa aparece no título. Use "Resgatar" se for relevante.`,
  }
}
