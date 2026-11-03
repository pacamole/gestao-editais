import { CAMPOS_CRITERIO_EDITAL, CAMPOS_CRITERIO_PERFIL, FAIXAS_EDITAL, OPERADORES_SEM_REFERENCIA } from '../../../shared/catalogoCriterios'
import { CAMPOS_EDITAL, MODALIDADES, type CampoEdital } from '../../../shared/rotulos'
import type { RegraCriterio } from './explicacaoCriterio'

// O critério como conta, montada com os parâmetros do cadastro (dado do edital, regra, comparar com, peso).
// Só sinais de conta conhecidos (÷ × = ≥ ≤ ≠ +); o resto em palavras. Espelha server/dominio/motorCriterios.ts:
// mudou a conta lá, muda aqui.

export type OrigemTermo = 'edital' | 'perfil' | 'fixo' | 'sistema'

export type Simbolo = { tipo: 'termo'; texto: string; origem: OrigemTermo } | { tipo: 'op'; texto: string }

export type LinhaFormula = { rotulo: string; simbolos: Simbolo[] }

export type RegraFormula = RegraCriterio & { peso: number | null }

const op = (texto: string): Simbolo => ({ tipo: 'op', texto })
const sistema = (texto: string): Simbolo => ({ tipo: 'termo', texto, origem: 'sistema' })

const tipoDoCampo = (campo: string) => (CAMPOS_EDITAL as Record<string, CampoEdital>)[campo]?.tipo
const dataDoCampo = (campo: string) => CAMPOS_CRITERIO_EDITAL[campo]?.tipo === 'data'

const termoEdital = (campo: string): Simbolo => ({ tipo: 'termo', texto: CAMPOS_CRITERIO_EDITAL[campo]?.rotulo ?? campo, origem: 'edital' })

// Valor fixo como o usuário cadastrou ("SUBVENCAO, CREDITO" vira "Subvenção ou Crédito").
function valorFixo(r: RegraCriterio): string {
  const itens = r.valor_referencia.split(',').map((i) => i.trim()).filter(Boolean)
  const rotulos = tipoDoCampo(r.campo_edital) === 'modalidade' ? itens.map((i) => MODALIDADES[i] ?? i) : itens
  return rotulos.length ? rotulos.join(' ou ') : '…'
}

function termosReferencia(r: RegraCriterio): Simbolo[] {
  if (r.campo_perfil === 'hoje') return [sistema('hoje')]
  const perfil = r.campo_perfil ? CAMPOS_CRITERIO_PERFIL[r.campo_perfil] : undefined
  if (perfil?.tipo === 'dias') return [sistema('hoje'), op('+'), { tipo: 'termo', texto: perfil.rotulo, origem: 'perfil' }]
  if (perfil) return [{ tipo: 'termo', texto: perfil.rotulo, origem: 'perfil' }]
  if (OPERADORES_SEM_REFERENCIA.includes(r.operador)) return []
  return [{ tipo: 'termo', texto: valorFixo(r), origem: 'fixo' }]
}

// A comparação do eliminatório (e dos pontuáveis de sim/não).
function comparacao(r: RegraCriterio): Simbolo[] {
  const e = [termoEdital(r.campo_edital)]
  const ref = termosReferencia(r)
  switch (r.operador) {
    case 'LISTA_VAZIA_OU_CONTEM':
      return [...ref, op('está em'), ...e, op('ou'), ...e, op('está vazio')]
    case 'CONTEM':
    case 'INTERSECCAO':
      return [...e, op('tem algum item de'), ...ref]
    case 'NAO_CONTEM':
      return [...e, op('não tem nenhum item de'), ...ref]
    case 'CONTIDO_EM':
      return [op('todos os itens de'), ...e, op('estão em'), ...ref]
    case 'IGUAL':
      return [...e, op('='), ...ref]
    case 'DIFERENTE':
      return [...e, op('≠'), ...ref]
    case 'MAIOR_QUE':
      return [...e, op('≥'), ...ref]
    case 'MENOR_QUE':
      return [...e, op('≤'), ...ref]
    case 'ENTRE': {
      const campoMax = FAIXAS_EDITAL[r.campo_edital]
      return [...e, op('≤'), ...ref, op('≤'), ...(campoMax ? [termoEdital(campoMax)] : [])]
    }
    case 'VERDADEIRO':
      return [...e, op('= sim')]
    case 'FALSO':
      return ref.length ? [...e, op('= não'), op('ou'), ...ref, op('= sim')] : [...e, op('= não')]
  }
}

// A pontuação (0 a 1) do pontuável.
function pontuacao(r: RegraCriterio): Simbolo[] {
  const e = [termoEdital(r.campo_edital)]
  const ref = termosReferencia(r)
  const quantos = (de: Simbolo[], em: Simbolo[]): Simbolo[] => [op('quantidade de itens de'), ...de, op('achados em'), ...em]
  switch (r.operador) {
    case 'CONTEM':
      return [...quantos(ref, e), op('÷'), op('quantidade de itens de'), ...ref]
    case 'NAO_CONTEM':
      return [op('1 −'), ...quantos(ref, e), op('÷'), op('quantidade de itens de'), ...ref]
    case 'INTERSECCAO':
    case 'CONTIDO_EM':
      return [...quantos(e, ref), op('÷'), op('quantidade de itens de'), ...e]
    case 'MAIOR_QUE':
      return dataDoCampo(r.campo_edital)
        ? [op('dias até'), ...e, op('÷'), op('dias até'), ...ref, op('(no máximo 1)')]
        : [...e, op('÷'), ...ref, op('(no máximo 1)')]
    case 'MENOR_QUE':
      return dataDoCampo(r.campo_edital)
        ? [op('1 se'), ...comparacao(r), op(', senão 0')]
        : [...ref, op('÷'), ...e, op('(no máximo 1)')]
    default:
      return [op('1 se'), ...comparacao(r), op(', senão 0')]
  }
}

/** A conta do critério com os parâmetros do cadastro. Vazia enquanto o dado do edital não foi escolhido. */
export function formulaDoCriterio(regra: RegraFormula): LinhaFormula[] {
  if (!regra.campo_edital) return []
  if (regra.tipo === 'ELIMINATORIO') return [{ rotulo: 'passa se', simbolos: comparacao(regra) }]
  return [
    { rotulo: 'pontuação =', simbolos: pontuacao(regra) },
    {
      rotulo: 'pontos =',
      simbolos: [
        sistema('pontuação'),
        op('×'),
        { tipo: 'termo', texto: `peso ${regra.peso ?? 1}`, origem: 'fixo' },
        op('÷'),
        sistema('soma dos pesos'),
        op('× 100'),
      ],
    },
  ]
}
