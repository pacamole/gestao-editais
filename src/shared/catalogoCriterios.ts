// Catálogo dos campos e operadores que um critério (§8) pode usar.
// Fonte única para a tela P07, a validação da API e o motor de avaliação:
// o comportamento de um critério sai do tipo dos campos e do operador, nunca do nome.

import type { Operador } from './tipos/dominio.js'
import { CAMPOS_EDITAL, type TipoCampo } from './rotulos.js'

// Tipo de valor, do ponto de vista da comparação.
// 'dias' só existe no perfil: quantidade de dias que, contra uma data do edital, vira "hoje + N dias".
export type TipoComparavel = 'lista' | 'numero' | 'data' | 'booleano' | 'texto' | 'dias'

export type CampoCriterio = { rotulo: string; tipo: TipoComparavel }

const TIPO_COMPARAVEL: Record<TipoCampo, TipoComparavel> = {
  texto: 'texto',
  modalidade: 'texto',
  moeda: 'numero',
  percentual: 'numero',
  inteiro: 'numero',
  data: 'data',
  dataHora: 'data',
  booleano: 'booleano',
  lista: 'lista',
}

// Campos do edital (§6) comparáveis, mais o texto bruto (busca de palavras-chave).
export const CAMPOS_CRITERIO_EDITAL: Record<string, CampoCriterio> = {
  ...Object.fromEntries(
    Object.entries(CAMPOS_EDITAL).map(([campo, def]) => [campo, { rotulo: def.rotulo, tipo: TIPO_COMPARAVEL[def.tipo] }]),
  ),
  texto_extraido: { rotulo: 'Texto do documento', tipo: 'texto' },
}

// Campos do perfil (§7) comparáveis. Os derivados (hoje, meses desde a fundação) são
// calculados pelo motor no momento da avaliação.
export const CAMPOS_CRITERIO_PERFIL: Record<string, CampoCriterio> = {
  cnae_principal: { rotulo: 'CNAE principal', tipo: 'texto' },
  cnaes_secundarios: { rotulo: 'CNAEs secundários', tipo: 'lista' },
  porte: { rotulo: 'Porte', tipo: 'texto' },
  natureza_juridica: { rotulo: 'Natureza jurídica', tipo: 'texto' },
  faturamento_anual: { rotulo: 'Faturamento anual', tipo: 'numero' },
  uf: { rotulo: 'UF', tipo: 'texto' },
  municipio: { rotulo: 'Município', tipo: 'texto' },
  areas_atuacao: { rotulo: 'Áreas de atuação', tipo: 'lista' },
  palavras_chave: { rotulo: 'Palavras-chave', tipo: 'lista' },
  possui_ict_parceira: { rotulo: 'Possui ICT parceira', tipo: 'booleano' },
  certidoes_disponiveis: { rotulo: 'Certidões disponíveis', tipo: 'lista' },
  capacidade_contrapartida_percentual: { rotulo: 'Capacidade de contrapartida (%)', tipo: 'numero' },
  valor_minimo_interesse: { rotulo: 'Valor mínimo de interesse', tipo: 'numero' },
  prazo_minimo_preparo_dias: { rotulo: 'Prazo mínimo de preparo (dias)', tipo: 'dias' },
  hoje: { rotulo: 'Data atual', tipo: 'data' },
  meses_desde_fundacao: { rotulo: 'Meses desde a fundação', tipo: 'numero' },
}

// Campos do edital que delimitam uma faixa com outro campo (operador ENTRE).
export const FAIXAS_EDITAL: Record<string, string> = {
  faturamento_minimo: 'faturamento_maximo',
}

// Leitura de cada operador como frase "campo do edital <operador> referência".
export const OPERADORES: Record<Operador, string> = {
  LISTA_VAZIA_OU_CONTEM: 'não restringe ou contém',
  CONTEM: 'contém',
  NAO_CONTEM: 'não contém',
  INTERSECCAO: 'tem item em comum com',
  CONTIDO_EM: 'está contido em',
  IGUAL: 'é igual a',
  DIFERENTE: 'é diferente de',
  MAIOR_QUE: 'é maior ou igual a',
  MENOR_QUE: 'é menor ou igual a',
  ENTRE: 'tem faixa que inclui',
  VERDADEIRO: 'é verdadeiro',
  FALSO: 'é falso (ou a empresa atende)',
}

// Operadores aceitos conforme o tipo do campo do edital.
export const OPERADORES_POR_TIPO: Record<Exclude<TipoComparavel, 'dias'>, Operador[]> = {
  lista: ['LISTA_VAZIA_OU_CONTEM', 'CONTEM', 'NAO_CONTEM', 'INTERSECCAO', 'CONTIDO_EM'],
  numero: ['MAIOR_QUE', 'MENOR_QUE', 'IGUAL', 'DIFERENTE', 'ENTRE'],
  data: ['MAIOR_QUE', 'MENOR_QUE'],
  booleano: ['VERDADEIRO', 'FALSO'],
  texto: ['IGUAL', 'DIFERENTE', 'CONTEM', 'NAO_CONTEM'],
}

// Operadores que dispensam referência (booleanos aceitam o perfil como alternativa opcional).
export const OPERADORES_SEM_REFERENCIA: Operador[] = ['VERDADEIRO', 'FALSO']

export function operadoresDoCampo(campoEdital: string): Operador[] {
  const campo = CAMPOS_CRITERIO_EDITAL[campoEdital]
  if (!campo || campo.tipo === 'dias') return []
  const operadores = OPERADORES_POR_TIPO[campo.tipo]
  return campoEdital in FAIXAS_EDITAL ? operadores : operadores.filter((op) => op !== 'ENTRE')
}

// Tipos de referência (campo do perfil) compatíveis com o tipo do campo do edital.
export const REFERENCIAS_COMPATIVEIS: Record<Exclude<TipoComparavel, 'dias'>, TipoComparavel[]> = {
  lista: ['lista', 'texto'],
  numero: ['numero'],
  data: ['data', 'dias'],
  booleano: ['booleano'],
  texto: ['texto', 'lista'],
}

export function camposPerfilCompativeis(campoEdital: string): string[] {
  const campo = CAMPOS_CRITERIO_EDITAL[campoEdital]
  if (!campo || campo.tipo === 'dias') return []
  const aceitos = REFERENCIAS_COMPATIVEIS[campo.tipo]
  return Object.keys(CAMPOS_CRITERIO_PERFIL).filter((nome) => aceitos.includes(CAMPOS_CRITERIO_PERFIL[nome]!.tipo))
}

// Validação de um critério contra o catálogo. Devolve a mensagem de erro, ou null se válido.
export function validarCriterio(c: {
  nome: string
  tipo: string
  campo_edital: string
  campo_perfil: string | null
  operador: string
  valor_referencia: string | null
  peso: number | null
}): string | null {
  if (!c.nome.trim()) return 'Informe o nome do critério.'
  const campo = CAMPOS_CRITERIO_EDITAL[c.campo_edital]
  if (!campo) return `Campo do edital desconhecido: "${c.campo_edital}".`
  if (!operadoresDoCampo(c.campo_edital).includes(c.operador as Operador)) {
    return `O operador ${c.operador} não se aplica ao campo "${campo.rotulo}".`
  }
  if (c.campo_perfil) {
    if (!CAMPOS_CRITERIO_PERFIL[c.campo_perfil]) return `Campo do perfil desconhecido: "${c.campo_perfil}".`
    if (!camposPerfilCompativeis(c.campo_edital).includes(c.campo_perfil)) {
      return `"${CAMPOS_CRITERIO_PERFIL[c.campo_perfil]!.rotulo}" não pode ser comparado com "${campo.rotulo}".`
    }
  }
  const semReferencia = !c.campo_perfil && !c.valor_referencia?.trim()
  if (semReferencia && !OPERADORES_SEM_REFERENCIA.includes(c.operador as Operador)) {
    return 'Informe o campo do perfil ou um valor de referência.'
  }
  if (c.valor_referencia?.trim() && !c.campo_perfil) {
    if (campo.tipo === 'numero' && !Number.isFinite(Number(c.valor_referencia))) return 'O valor de referência deve ser numérico.'
    if (campo.tipo === 'data' && !/^\d{4}-\d{2}-\d{2}$/.test(c.valor_referencia.trim())) {
      return 'O valor de referência deve ser uma data AAAA-MM-DD (ou use o campo "Data atual").'
    }
  }
  if (c.tipo === 'PONTUAVEL' && (c.peso == null || !Number.isInteger(c.peso) || c.peso < 1 || c.peso > 10)) {
    return 'Critério pontuável precisa de peso inteiro entre 1 e 10.'
  }
  return null
}
