import { novoId } from '../db/index.js'
import { repositorios } from '../repositorios/index.js'
import type { StatusEdital, StatusElegibilidade } from '../dominio/entidades.js'
import { normalizarLista } from '../util/listas.js'

function obterCampo(obj: Record<string, any> | null | undefined, campo: string | null | undefined) {
  if (!campo || !obj) return undefined
  if (campo === 'hoje') return new Date().toISOString().slice(0, 10)
  return obj[campo]
}

function valorTexto(valor: unknown): string {
  if (valor == null) return ''
  if (typeof valor === 'string') return valor.trim()
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor)
  return JSON.stringify(valor)
}

function executarOperador(criterio: any, edital: any, perfil: any): boolean {
  const valorEd = obterCampo(edital, criterio.campo_edital)
  const valorPerfil = criterio.campo_perfil ? obterCampo(perfil, criterio.campo_perfil) : criterio.valor_referencia

  if (criterio.operador === 'VERDADEIRO') return Boolean(valorPerfil) && Boolean(valorEd)
  if (criterio.operador === 'FALSO') return !Boolean(valorPerfil) && !Boolean(valorEd)
  if (criterio.operador === 'IGUAL') return valorTexto(valorPerfil) === valorTexto(valorEd)
  if (criterio.operador === 'DIFERENTE') return valorTexto(valorPerfil) !== valorTexto(valorEd)
  if (criterio.operador === 'MAIOR_QUE') {
    const a = Number(valorPerfil)
    const b = Number(valorEd)
    if (Number.isFinite(a) && Number.isFinite(b)) return a > b
    if (valorPerfil != null && valorEd != null) return String(valorPerfil) > String(valorEd)
    return Boolean(valorEd)
  }
  if (criterio.operador === 'MENOR_QUE') {
    const a = Number(valorPerfil)
    const b = Number(valorEd)
    if (Number.isFinite(a) && Number.isFinite(b)) return a < b
    return String(valorPerfil ?? '').length < String(valorEd ?? '').length
  }
  if (criterio.operador === 'ENTRE') {
    const min = Number(valorEd)
    const max = Number(criterio.valor_referencia ?? obterCampo(edital, 'faturamento_maximo'))
    const atual = Number(valorPerfil)
    return Number.isFinite(atual) && Number.isFinite(min) && Number.isFinite(max) ? atual >= min && atual <= max : true
  }
  const listaEd = normalizarLista(valorEd)
  const listaPerfil = normalizarLista(valorPerfil)
  if (criterio.operador === 'LISTA_VAZIA_OU_CONTEM') {
    if (!listaEd.length) return true
    return listaPerfil.some((item) => listaEd.includes(item))
  }
  if (criterio.operador === 'CONTEM') return listaPerfil.some((item) => String(valorEd ?? '').toLowerCase().includes(item.toLowerCase()))
  if (criterio.operador === 'NAO_CONTEM') return !listaPerfil.some((item) => String(valorEd ?? '').toLowerCase().includes(item.toLowerCase()))
  if (criterio.operador === 'INTERSECCAO') return listaPerfil.some((item) => listaEd.includes(item))
  if (criterio.operador === 'CONTIDO_EM') return listaPerfil.every((item) => listaEd.includes(item))
  if (criterio.operador === 'FALSO') return !Boolean(valorEd) || !Boolean(valorPerfil)
  return true
}

function pontoCriterio(criterio: any, edital: any, perfil: any): number | null {
  const valorEd = obterCampo(edital, criterio.campo_edital)
  const valorPerfil = criterio.campo_perfil ? obterCampo(perfil, criterio.campo_perfil) : criterio.valor_referencia

  if (criterio.nome === 'Aderência temática') {
    const temaEd = normalizarLista(valorEd)
    const temaPerfil = normalizarLista(valorPerfil)
    if (!temaEd.length || !temaPerfil.length) return null
    return Math.min(1, temaPerfil.filter((item) => temaEd.some((ed) => ed.toLowerCase() === item.toLowerCase())).length / Math.max(temaPerfil.length, 1))
  }

  if (criterio.nome === 'Valor da oportunidade') {
    const valorOportunidade = Number(valorEd)
    const valorMinimo = Number(valorPerfil)
    if (!Number.isFinite(valorOportunidade) || !Number.isFinite(valorMinimo)) return null
    return valorOportunidade >= valorMinimo ? 1 : 0
  }

  if (criterio.nome === 'Folga de prazo') {
    if (!valorEd) return null
    const hoje = new Date()
    const prazo = new Date(String(valorEd))
    const dias = Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    if (!Number.isFinite(dias)) return null
    return dias > 30 ? 1 : dias > 7 ? 0.6 : dias > 0 ? 0.3 : 0
  }

  if (criterio.nome === 'Modalidade preferida') {
    return String(valorEd) === String(criterio.valor_referencia) ? 1 : 0
  }

  if (criterio.nome === 'Ausência de contrapartida') {
    return Boolean(valorEd) ? 0 : 1
  }

  if (criterio.nome === 'Densidade de palavras-chave') {
    const texto = String(valorEd ?? '').toLowerCase()
    const palavras = normalizarLista(valorPerfil).map((item) => item.toLowerCase())
    if (!texto || !palavras.length) return null
    const ocorrencias = palavras.filter((palavra) => texto.includes(palavra)).length
    return ocorrencias > 0 ? Math.min(1, ocorrencias / palavras.length) : 0
  }

  return null
}

export function simularConfiguracao(editalId: string) {
  const edital = repositorios.edital.buscarPorId(editalId)
  if (!edital) throw new Error('Edital não encontrado.')
  const perfil = repositorios.perfilEmpresa.obter()
  const criterios = repositorios.criterio.listar().filter((criteria) => criteria.ativo)

  const falhas: { criterio_id: string; nome: string; mensagem: string }[] = []
  let nota = 0
  let pesoTotal = 0

  for (const criterio of criterios) {
    if (criterio.tipo === 'ELIMINATORIO') {
      const ok = executarOperador(criterio, edital, perfil ?? {})
      if (!ok) {
        falhas.push({
          criterio_id: criterio.id,
          nome: criterio.nome,
          mensagem: criterio.mensagem_reprovacao ?? 'Critério não atendido.',
        })
      }
    } else {
      const peso = Number(criterio.peso ?? 0)
      if (!peso) continue
      const score = pontoCriterio(criterio, edital, perfil ?? {})
      if (score == null) continue
      nota += peso * score
      pesoTotal += peso
    }
  }

  const notaFit = pesoTotal > 0 ? (nota / pesoTotal) * 100 : 100
  const status: StatusElegibilidade = falhas.length > 0 ? 'INELEGIVEL' : notaFit >= 70 ? 'ELEGIVEL' : notaFit >= 40 ? 'INDETERMINADO' : 'INELEGIVEL'

  return {
    status,
    nota_fit: Number(notaFit.toFixed(1)),
    falhas,
    resumo: falhas.length ? 'Com a configuração atual, o edital seria rejeitado pela regra eliminatória.' : 'Com a configuração atual, o edital continua compativel.',
  }
}

const STATUS_EDITAL_ATIVOS: StatusEdital[] = ['COLETADO', 'EM_ANALISE', 'ANALISADO', 'FALHA', 'EM_REVISAO', 'APROVADO']

export function reavaliarEditaisAtivos(perfilAtualizadoEm: string): number {
  let total = 0
  for (const edital of repositorios.edital.listarPorStatus(STATUS_EDITAL_ATIVOS)) {
    const resultado = simularConfiguracao(edital.id)
    const nota = resultado.nota_fit
    repositorios.avaliacao.inserir({
      id: novoId(),
      edital_id: edital.id,
      status_elegibilidade: resultado.status,
      nota_fit: nota,
      classificacao: nota >= 70 ? 'ALTO' : nota >= 40 ? 'MEDIO' : 'BAIXO',
      criterios_violados: resultado.falhas.map((falha) => ({
        criterio_id: falha.criterio_id,
        nome: falha.nome,
        motivo: falha.mensagem,
        evidencia_id: null,
      })),
      criterios_indeterminados: null,
      detalhamento_pontuacao: null,
      nota_ajustada_manual: null,
      ajustada_por: null,
      perfil_atualizado_em: perfilAtualizadoEm,
    })
    total++
  }
  return total
}
