import type { Operador, TipoCriterio } from '../../../shared/tipos/criterios'
import { CAMPOS_CRITERIO_EDITAL, CAMPOS_CRITERIO_PERFIL, OPERADORES_SEM_REFERENCIA } from '../../../shared/catalogoCriterios'

// Explicação, em português, de como o sistema calcula um critério. Espelha server/dominio/motorCriterios.ts:
// mudou a regra lá, muda o texto aqui.

export type RegraCriterio = {
  tipo: TipoCriterio
  campo_edital: string
  campo_perfil: string
  operador: Operador
  valor_referencia: string
  mensagem_reprovacao?: string
}

export type Explicacao = {
  /** Frase curta para a lista de critérios. */
  resumo: string
  /** Passo a passo do cálculo, para o formulário. */
  passos: { icone: '✓' | '✕' | '?' | '•'; texto: string }[]
}

const tipoEdital = (campo: string) => CAMPOS_CRITERIO_EDITAL[campo]?.tipo

function nomeDoEdital(campo: string): string {
  return `${CAMPOS_CRITERIO_EDITAL[campo]?.rotulo ?? campo} (do edital)`
}

function nomeDaReferencia(r: RegraCriterio): string {
  if (r.campo_perfil === 'hoje') return 'hoje'
  if (r.campo_perfil && CAMPOS_CRITERIO_PERFIL[r.campo_perfil]?.tipo === 'dias') {
    return 'hoje + os dias de preparo do perfil'
  }
  if (r.campo_perfil) return `${CAMPOS_CRITERIO_PERFIL[r.campo_perfil]?.rotulo ?? r.campo_perfil} (do perfil)`
  return r.valor_referencia.trim() ? `"${r.valor_referencia.trim()}"` : 'o valor fixo'
}

// Quando o edital atende ao critério (a mesma pergunta para eliminatório e, nos operadores de sim/não, para pontuável).
function condicao(r: RegraCriterio): string {
  const e = nomeDoEdital(r.campo_edital)
  const ref = nomeDaReferencia(r)
  const data = tipoEdital(r.campo_edital) === 'data'
  switch (r.operador) {
    case 'LISTA_VAZIA_OU_CONTEM':
      return `${e} não tem restrição ou inclui ${ref}`
    case 'CONTEM':
      return `${e} contém pelo menos um item de ${ref}`
    case 'NAO_CONTEM':
      return `${e} não contém nenhum item de ${ref}`
    case 'INTERSECCAO':
      return `${e} tem pelo menos um item em comum com ${ref}`
    case 'CONTIDO_EM':
      return `tudo o que ${e} exige está em ${ref}`
    case 'IGUAL':
      return `${e} é igual a ${ref}`
    case 'DIFERENTE':
      return `${e} é diferente de ${ref}`
    case 'MAIOR_QUE':
      return data ? `${e} é igual ou posterior a ${ref}` : `${e} é maior ou igual a ${ref}`
    case 'MENOR_QUE':
      return data ? `${e} é igual ou anterior a ${ref}` : `${e} é menor ou igual a ${ref}`
    case 'ENTRE':
      return `${ref} está dentro da faixa mínima e máxima de ${e}`
    case 'VERDADEIRO':
      return `${e} é "sim"`
    case 'FALSO':
      return r.campo_perfil ? `${e} é "não", ou ${ref} é "sim"` : `${e} é "não"`
  }
}

// Como sai a pontuação de 0 a 1 de um critério pontuável.
function pontuacao(r: RegraCriterio): string {
  const e = nomeDoEdital(r.campo_edital)
  const ref = nomeDaReferencia(r)
  const data = tipoEdital(r.campo_edital) === 'data'
  switch (r.operador) {
    case 'CONTEM':
      return `a parte dos itens de ${ref} que aparecem em ${e} (ex.: 3 de 10 = 0,3)`
    case 'NAO_CONTEM':
      return `1 menos a parte dos itens de ${ref} que aparecem em ${e}`
    case 'INTERSECCAO':
    case 'CONTIDO_EM':
      return `a parte dos itens de ${e} que estão em ${ref} (ex.: 2 de 4 = 0,5)`
    case 'MAIOR_QUE':
      return data
        ? `os dias até ${e} divididos pelos dias até ${ref}, no máximo 1 (metade do tempo vale 0,5)`
        : `${e} dividido por ${ref}, no máximo 1 (metade do valor vale 0,5)`
    case 'MENOR_QUE':
      return data
        ? `1 se ${condicao(r)}; senão 0`
        : `1 se ${condicao(r)}; acima disso cai na proporção (o dobro vale 0,5)`
    default:
      return `1 se ${condicao(r)}; senão 0`
  }
}

export function explicarCriterio(r: RegraCriterio, peso?: { peso: number; total: number }): Explicacao {
  if (!r.campo_edital) return { resumo: '', passos: [] }
  const e = nomeDoEdital(r.campo_edital)
  const doPerfil = r.campo_perfil && r.campo_perfil !== 'hoje' && !OPERADORES_SEM_REFERENCIA.includes(r.operador)
  const perfilVazio = doPerfil
    ? [{ icone: '•' as const, texto: `Se ${CAMPOS_CRITERIO_PERFIL[r.campo_perfil]?.rotulo ?? r.campo_perfil} estiver vazio no perfil da empresa, o critério não se aplica.` }]
    : []

  if (r.tipo === 'ELIMINATORIO') {
    const motivo = r.mensagem_reprovacao?.trim().replace(/\.+$/, '')
    return {
      resumo: `Passa quando ${condicao(r)}.`,
      passos: [
        { icone: '✓', texto: `Passa quando ${condicao(r)}.` },
        { icone: '✕', texto: `Senão, o edital fica Não elegível${motivo ? `, com o motivo: "${motivo}"` : ''}.` },
        { icone: '?', texto: `Se a IA não achar ${e} no documento, o edital fica Em revisão para alguém conferir.` },
        ...perfilVazio,
      ],
    }
  }

  const fatia = peso && peso.total ? Math.round((100 * peso.peso) / peso.total) : null
  return {
    resumo: `Pontua ${pontuacao(r)}.`,
    passos: [
      { icone: '•', texto: `Pontuação de 0 a 1: ${pontuacao(r)}.` },
      ...(peso
        ? [{ icone: '•' as const, texto: `Peso ${peso.peso} de ${peso.total} nos critérios ativos: vale até ${fatia}% da nota do edital.` }]
        : []),
      { icone: '?', texto: `Se o edital não informar ${e}, o critério sai da conta e não tira pontos.` },
      ...perfilVazio,
    ],
  }
}
