import { novoId, transacao } from '../db/index.js'
import type { Edital } from '../dominio/entidades.js'
import { ErroNaoEncontrado, ErroValidacao } from '../dominio/erros.js'
import { MARCADOR_EDICAO_MANUAL, validarCamposManuais, type CampoEditavel } from '../dominio/validacaoCamposEdital.js'
import type { FiltroListaEditais, LinhaListaEdital } from '../repositorios/EditalRepositorio.js'
import type { Repositorios } from '../repositorios/index.js'
import { diasAte, hoje, prazoVencido, somarDias } from '../../shared/datas.js'
import { STATUS_ATIVOS } from '../../shared/statusEdital.js'
import { ELEGIBILIDADE, MODALIDADES, rotuloDaFonte, STATUS_EDITAL } from '../../shared/rotulos.js'
import type { DetalheEditalResposta, SalvarCamposResposta } from '../../shared/tipos/edital.js'
import type { ItemListaEdital, ListaEditaisResposta } from '../../shared/tipos/editais.js'

type RepositoriosEdital = Pick<Repositorios, 'edital' | 'avaliacao' | 'evidencia' | 'revisao' | 'triagemElegibilidade'>

const DIA_MS = 86_400_000
const JANELA_URGENTE_DIAS = 7
const LIMITE_MAXIMO_POR_PAGINA = 100
const LIMITE_PADRAO_POR_PAGINA = 10

// Consulta como chega da tela: valores 'TODOS'/'TODAS' e textos vazios significam "sem filtro".
export type ConsultaEditais = {
  busca?: string
  status?: string
  elegibilidade?: string
  faixaFit?: string
  modalidade?: string
  fonteId?: string
  prazoDe?: string
  prazoAte?: string
  somentePrazoAberto?: boolean
  novosSemana?: boolean
  prazoUrgente?: boolean
  pagina?: number
  limite?: number
}

const preenchido = (valor: string | undefined, semFiltro: string): string | undefined => {
  const limpo = valor?.trim()
  return limpo && limpo !== semFiltro ? limpo : undefined
}

export class EditalServico {
  constructor(
    private readonly repos: RepositoriosEdital,
    // Depois de editar campos à mão, a avaliação é refeita na hora (sem chamar a IA).
    private readonly aoEditarCampos: (editalId: string) => void = () => {},
    // Dias sem atualização para expirar um edital que não tem prazo definido.
    private readonly diasExpirarSemPrazo: () => number = () => 60,
  ) {}

  listar(consulta: ConsultaEditais, instante = new Date()): ListaEditaisResposta {
    const pagina = Math.max(1, Number(consulta.pagina ?? 1) || 1)
    const limite = Math.max(1, Math.min(LIMITE_MAXIMO_POR_PAGINA, Number(consulta.limite ?? LIMITE_PADRAO_POR_PAGINA) || LIMITE_PADRAO_POR_PAGINA))
    const { itens, total } = this.repos.edital.listarFiltrado(this.filtro(consulta, instante), limite, (pagina - 1) * limite)
    return {
      itens: itens.map((item) => this.paraItem(item, instante)),
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
    }
  }

  /** CSV (separador ';', com BOM para o Excel) de todos os editais do filtro. */
  exportarCsv(consulta: ConsultaEditais, instante = new Date()): string {
    const campo = (valor: unknown) => `"${valor == null ? '' : String(valor).replace(/"/g, '""')}"`
    const cabecalho = [
      'Título',
      'Órgão Financiador',
      'Modalidade',
      'Prazo de Inscrição',
      'Valor Máximo (R$)',
      'Elegibilidade',
      'Nota de Fit',
      'Status',
      'Fonte',
    ].join(';')

    const linhas = this.repos.edital.listarParaExportacao(this.filtro(consulta, instante)).map((l) =>
      [
        campo(l.titulo),
        campo(l.orgao_financiador),
        campo((l.modalidade && MODALIDADES[l.modalidade]) ?? l.modalidade ?? ''),
        campo(l.prazo_inscricao),
        campo(l.valor_maximo_por_projeto != null ? l.valor_maximo_por_projeto.toLocaleString('pt-BR') : ''),
        campo((l.status_elegibilidade && ELEGIBILIDADE[l.status_elegibilidade]) ?? l.status_elegibilidade ?? 'Sem avaliação'),
        campo(l.nota_ajustada_manual ?? l.nota_fit ?? ''),
        campo(STATUS_EDITAL[l.status] ?? l.status ?? ''),
        campo(l.fonte_nome ? rotuloDaFonte({ nome: l.fonte_nome }) : ''),
      ].join(';'),
    )
    return '﻿' + [cabecalho, ...linhas].join('\r\n')
  }

  /** Marca como expirados os editais em andamento cujo prazo já passou. Devolve quantos. */
  expirarVencidos(instante = new Date()): number {
    let total = 0
    for (const edital of this.repos.edital.listarComPrazo(STATUS_ATIVOS)) {
      // O prazo vence ao fim do dia (horário de Brasília).
      if (prazoVencido(edital.prazo_inscricao, instante)) {
        this.repos.edital.atualizar(edital.id, { status: 'EXPIRADO' })
        total++
      }
    }
    // Sem prazo e parado há tempo demais: ninguém vai agir sobre ele. Aprovados ficam, a decisão já é humana.
    const limite = new Date(instante.getTime() - this.diasExpirarSemPrazo() * DIA_MS).toISOString()
    for (const edital of this.repos.edital.listarSemPrazoParadosDesde(STATUS_ATIVOS.filter((s) => s !== 'APROVADO'), limite)) {
      this.repos.edital.atualizar(edital.id, {
        status: 'EXPIRADO',
        erro_processamento: `Expirado: sem prazo definido e sem atualização há mais de ${this.diasExpirarSemPrazo()} dias.`,
      })
      total++
    }
    return total
  }

  detalhe(editalId: string): DetalheEditalResposta {
    const edital = this.buscar(editalId)
    return {
      edital,
      avaliacao: this.repos.avaliacao.ultimaDoEdital(edital.id) ?? null,
      evidencias: this.repos.evidencia.listarDoEdital(edital.id),
      revisoes: this.repos.revisao.listarDoEdital(edital.id),
      analise_elegibilidade: this.repos.triagemElegibilidade.ultimaDoEdital(edital.id),
    }
  }

  /** Edição manual: grava os campos e marca a evidência como "editado manualmente". */
  editarCampos(editalId: string, campos: unknown): SalvarCamposResposta {
    const edital = this.buscar(editalId)

    let alteracoes: Partial<Edital>
    try {
      alteracoes = validarCamposManuais(campos)
    } catch (erro) {
      throw new ErroValidacao(erro instanceof Error ? erro.message : 'Os campos informados são inválidos.')
    }

    const atualizados = Object.keys(alteracoes) as CampoEditavel[]
    transacao(() => {
      this.repos.edital.atualizar(edital.id, alteracoes)
      for (const campo of atualizados) {
        this.repos.evidencia.excluirDoCampo(edital.id, campo)
        this.repos.evidencia.inserir({
          id: novoId(),
          edital_id: edital.id,
          campo,
          trecho_literal: MARCADOR_EDICAO_MANUAL,
          pagina: null,
          confianca: null,
        })
      }
    })

    this.aoEditarCampos(edital.id)
    return { edital: this.repos.edital.buscarPorId(edital.id)!, campos: atualizados, mensagem: 'Dados atualizados manualmente.' }
  }

  // Traduz o que a tela pede nos critérios do repositório, resolvendo as datas de referência.
  private filtro(consulta: ConsultaEditais, instante: Date): FiltroListaEditais {
    const status = preenchido(consulta.status, 'TODOS')
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const faixa = preenchido(consulta.faixaFit, 'TODAS')?.toUpperCase()
    const dia = hoje(instante)
    return {
      busca: consulta.busca?.trim() || undefined,
      status: status?.length ? status : undefined,
      elegibilidade: preenchido(consulta.elegibilidade, 'TODAS'),
      faixaFit: faixa === 'ALTO' || faixa === 'MEDIO' || faixa === 'BAIXO' ? faixa : undefined,
      modalidade: preenchido(consulta.modalidade, 'TODAS'),
      fonteId: preenchido(consulta.fonteId, 'TODAS'),
      prazoDe: consulta.prazoDe?.trim() || undefined,
      prazoAte: consulta.prazoAte?.trim() || undefined,
      prazoAbertoDesde: consulta.somentePrazoAberto ? dia : undefined,
      criadoDesde: consulta.novosSemana ? new Date(instante.getTime() - 7 * DIA_MS).toISOString() : undefined,
      prazoEntre: consulta.prazoUrgente ? [dia, somarDias(dia, JANELA_URGENTE_DIAS)] : undefined,
    }
  }

  private paraItem(linha: LinhaListaEdital, instante: Date): ItemListaEdital {
    const dias = linha.prazo_inscricao ? diasAte(linha.prazo_inscricao, instante) : Number.NaN
    const diasRestantes = Number.isNaN(dias) ? null : dias
    return {
      ...linha,
      dias_restantes: diasRestantes,
      prazo_urgente: diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= JANELA_URGENTE_DIAS,
    } as ItemListaEdital
  }

  private buscar(editalId: string): Edital {
    const edital = this.repos.edital.buscarPorId(editalId)
    if (!edital) throw new ErroNaoEncontrado('Edital não encontrado.')
    return edital
  }
}
