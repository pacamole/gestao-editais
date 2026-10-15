import { novoId } from '../db/index.js'
import { repositorios } from '../repositorios/index.js'
import type { Classificacao, Criterio, Edital, PerfilEmpresa, StatusEdital } from '../dominio/entidades.js'
import type { ResultadoSimulacao } from '../../shared/tipos/criterios.js'
import { avaliarEliminatorio, pontuar } from './motorCriterios.js'

export type ResultadoAvaliacao = ResultadoSimulacao

// Faixas de classificação da nota de fit (§8).
const FAIXA_ALTO = 70
const FAIXA_MEDIO = 40

const STATUS_EDITAL_ATIVOS: StatusEdital[] = ['COLETADO', 'EM_ANALISE', 'ANALISADO', 'FALHA', 'EM_REVISAO', 'APROVADO']

const arredondar = (valor: number, casas: number) => Number(valor.toFixed(casas))

export function classificar(nota: number): Classificacao {
  return nota >= FAIXA_ALTO ? 'ALTO' : nota >= FAIXA_MEDIO ? 'MEDIO' : 'BAIXO'
}

/**
 * Elegibilidade e nota de fit de um edital (§8). Função pura.
 * Elegibilidade depende só dos eliminatórios: reprovação vence indeterminação.
 * A nota só é calculada para editais elegíveis; critérios sem dado saem da conta.
 */
export function calcularAvaliacao(edital: Edital, perfil: PerfilEmpresa, criterios: Criterio[], agora = new Date()): ResultadoAvaliacao {
  const ativos = criterios.filter((c) => c.ativo)
  const resultado: ResultadoAvaliacao = {
    status_elegibilidade: 'ELEGIVEL',
    nota_fit: null,
    classificacao: null,
    criterios_violados: [],
    criterios_indeterminados: [],
    detalhamento_pontuacao: [],
  }

  for (const criterio of ativos.filter((c) => c.tipo === 'ELIMINATORIO')) {
    const r = avaliarEliminatorio(criterio, edital, perfil, agora)
    if (r.resultado === 'REPROVA') {
      resultado.criterios_violados.push({ criterio_id: criterio.id, nome: criterio.nome, motivo: r.motivo, evidencia_id: null })
    } else if (r.resultado === 'INDETERMINADO') {
      resultado.criterios_indeterminados.push({ criterio_id: criterio.id, nome: criterio.nome, campo_faltante: r.campo_faltante })
    }
  }

  if (resultado.criterios_violados.length) resultado.status_elegibilidade = 'INELEGIVEL'
  else if (resultado.criterios_indeterminados.length) resultado.status_elegibilidade = 'INDETERMINADO'
  if (resultado.status_elegibilidade !== 'ELEGIVEL') return resultado

  const pontuados = ativos
    .filter((c) => c.tipo === 'PONTUAVEL' && c.peso)
    .map((c) => ({ criterio: c, peso: c.peso!, pontuacao: pontuar(c, edital, perfil, agora) }))
    .filter((item): item is typeof item & { pontuacao: number } => item.pontuacao != null)
  const pesoTotal = pontuados.reduce((soma, item) => soma + item.peso, 0)
  if (!pesoTotal) return resultado

  resultado.detalhamento_pontuacao = pontuados.map(({ criterio, peso, pontuacao }) => ({
    criterio_id: criterio.id,
    nome: criterio.nome,
    peso,
    pontuacao: arredondar(pontuacao, 2),
    contribuicao: arredondar((100 * peso * pontuacao) / pesoTotal, 1),
  }))
  const nota = arredondar((100 * pontuados.reduce((soma, item) => soma + item.peso * item.pontuacao, 0)) / pesoTotal, 1)
  resultado.nota_fit = nota
  resultado.classificacao = classificar(nota)
  return resultado
}

function avaliarComDadosAtuais(editalId: string) {
  const edital = repositorios.edital.buscarPorId(editalId)
  if (!edital) throw new Error('Edital não encontrado.')
  const perfil = repositorios.perfilEmpresa.obter()
  if (!perfil) throw new Error('Cadastre o perfil da empresa antes de avaliar editais.')
  return { perfil, resultado: calcularAvaliacao(edital, perfil, repositorios.criterio.listar()) }
}

// Avalia com o perfil e os critérios atuais do banco, sem gravar (P07 "Simular").
export function simularAvaliacao(editalId: string): ResultadoAvaliacao {
  return avaliarComDadosAtuais(editalId).resultado
}

// Avalia e grava uma nova avaliação do edital.
export function registrarAvaliacao(editalId: string): ResultadoAvaliacao {
  const { perfil, resultado } = avaliarComDadosAtuais(editalId)
  repositorios.avaliacao.inserir({
    id: novoId(),
    edital_id: editalId,
    ...resultado,
    nota_ajustada_manual: null,
    ajustada_por: null,
    perfil_atualizado_em: perfil.atualizado_em,
  })
  return resultado
}

export function reavaliarEditaisAtivos(): number {
  const editais = repositorios.edital.listarPorStatus(STATUS_EDITAL_ATIVOS)
  for (const edital of editais) registrarAvaliacao(edital.id)
  return editais.length
}
