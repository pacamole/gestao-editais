import { novoId } from '../db/index.js'
import { calcularAvaliacao, type ResultadoAvaliacao } from '../dominio/avaliacao.js'
import { ErroNaoEncontrado, ErroRegraNegocio } from '../dominio/erros.js'
import type { Repositorios } from '../repositorios/index.js'
import { STATUS_ATIVOS } from '../../shared/statusEdital.js'

type RepositoriosAvaliacao = Pick<Repositorios, 'edital' | 'perfilEmpresa' | 'criterio' | 'avaliacao' | 'triagemElegibilidade'>

// Avalia editais com o perfil e os critérios atuais do banco.
export class AvaliacaoServico {
  constructor(private readonly repos: RepositoriosAvaliacao) {}

  /** Avalia sem gravar (P07 "Simular"). */
  simular(editalId: string): ResultadoAvaliacao {
    return this.avaliarComDadosAtuais(editalId).resultado
  }

  /** Avalia e grava uma nova avaliação do edital. */
  registrar(editalId: string): ResultadoAvaliacao {
    const { perfil, resultado } = this.avaliarComDadosAtuais(editalId)
    const statusTriagem = this.repos.triagemElegibilidade.ultimaCompativelComPerfil(editalId, perfil.atualizado_em)
    if (statusTriagem === 'INELEGIVEL') {
      resultado.status_elegibilidade = 'INELEGIVEL'
      this.limparPontuacao(resultado)
    } else if (statusTriagem === 'INDETERMINADO' && resultado.status_elegibilidade !== 'INELEGIVEL') {
      resultado.status_elegibilidade = 'INDETERMINADO'
      this.limparPontuacao(resultado)
    }
    this.gravar(editalId, perfil, resultado)
    return resultado
  }

  /** Grava a primeira etapa: a decisão vem da triagem de IA; eliminatórios ficam para a análise profunda. */
  registrarTriagem(editalId: string, status: ResultadoAvaliacao['status_elegibilidade']): ResultadoAvaliacao {
    const { perfil, resultado } = this.avaliarComDadosAtuais(editalId, false)
    resultado.status_elegibilidade = status
    if (status !== 'ELEGIVEL') this.limparPontuacao(resultado)
    this.gravar(editalId, perfil, resultado)
    return resultado
  }

  private gravar(editalId: string, perfil: NonNullable<ReturnType<Repositorios['perfilEmpresa']['obter']>>, resultado: ResultadoAvaliacao): void {
    this.repos.avaliacao.inserir({
      id: novoId(),
      edital_id: editalId,
      ...resultado,
      nota_ajustada_manual: null,
      ajustada_por: null,
      perfil_atualizado_em: perfil.atualizado_em,
    })
  }

  /** Reavalia todos os editais em andamento (depois de mudar o perfil ou os critérios). */
  reavaliarAtivos(): number {
    const editais = this.repos.edital.listarPorStatus(STATUS_ATIVOS)
    for (const edital of editais) this.registrar(edital.id)
    return editais.length
  }

  private avaliarComDadosAtuais(editalId: string, considerarEliminatorios = true) {
    const edital = this.repos.edital.buscarPorId(editalId)
    if (!edital) throw new ErroNaoEncontrado('Edital não encontrado.')
    const perfil = this.repos.perfilEmpresa.obter()
    if (!perfil) throw new ErroRegraNegocio('Cadastre o perfil da empresa antes de avaliar editais.')
    return { perfil, resultado: calcularAvaliacao(edital, perfil, this.repos.criterio.listar(), new Date(), considerarEliminatorios) }
  }

  private limparPontuacao(resultado: ResultadoAvaliacao): void {
    resultado.nota_fit = null
    resultado.classificacao = null
    resultado.detalhamento_pontuacao = []
  }
}
