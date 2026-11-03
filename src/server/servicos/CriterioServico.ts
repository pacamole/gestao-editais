import { novoId } from '../db/index.js'
import type { Operador, TipoCriterio } from '../dominio/entidades.js'
import { ErroNaoEncontrado, ErroRegraNegocio, ErroValidacao } from '../dominio/erros.js'
import type { Repositorios } from '../repositorios/index.js'
import { validarCriterio } from '../../shared/catalogoCriterios.js'
import type {
  CriterioResposta,
  ExcluirCriterioResposta,
  ListaCriteriosResposta,
  ResultadoSimulacao,
  SimulacaoResposta,
} from '../../shared/tipos/criterios.js'

type RepositoriosCriterio = Pick<Repositorios, 'criterio'>

const opcional = (valor: unknown): string | null => (valor == null || valor === '' ? null : String(valor).trim())

// Critérios de avaliação (eliminatórios e pontuáveis) configuráveis pelo usuário.
export class CriterioServico {
  constructor(
    private readonly repos: RepositoriosCriterio,
    private readonly simularAvaliacao: (editalId: string) => ResultadoSimulacao,
    // Mudar um critério muda a elegibilidade e a nota: os editais em andamento são reavaliados na hora.
    private readonly reavaliarEditais: () => number = () => 0,
  ) {}

  listar(): ListaCriteriosResposta {
    return {
      eliminatorios: this.repos.criterio.listarPorTipo('ELIMINATORIO'),
      pontuaveis: this.repos.criterio.listarPorTipo('PONTUAVEL'),
    }
  }

  salvar(item: Record<string, unknown>): CriterioResposta {
    const tipo: TipoCriterio = item.tipo === 'PONTUAVEL' ? 'PONTUAVEL' : 'ELIMINATORIO'
    const dados = {
      id: item.id ? String(item.id) : novoId(),
      nome: String(item.nome ?? '').trim(),
      tipo,
      campo_edital: String(item.campo_edital ?? '').trim(),
      campo_perfil: item.campo_perfil ? String(item.campo_perfil).trim() : null,
      operador: String(item.operador ?? '') as Operador,
      valor_referencia: opcional(item.valor_referencia),
      peso: tipo === 'PONTUAVEL' && item.peso != null && item.peso !== '' ? Number(item.peso) : null,
      mensagem_reprovacao: item.mensagem_reprovacao == null || item.mensagem_reprovacao === '' ? null : String(item.mensagem_reprovacao),
      ativo: item.ativo !== false,
    }

    const erro = validarCriterio(dados)
    if (erro) throw new ErroValidacao(erro)

    const existente = this.repos.criterio.buscarPorId(dados.id)
    // Critério novo entra no fim da lista do seu tipo.
    const salvo = existente
      ? this.repos.criterio.atualizar(dados.id, dados)
      : this.repos.criterio.inserir({ ...dados, ordem: this.repos.criterio.listarPorTipo(tipo).length })
    return { ok: true, criterio: salvo!, editaisReavaliados: this.reavaliarEditais() }
  }

  excluir(id: string): ExcluirCriterioResposta {
    const removido = this.repos.criterio.excluir(id)
    return { ok: true, removido, editaisReavaliados: removido ? this.reavaliarEditais() : 0 }
  }

  alternarAtivo(id: string): CriterioResposta {
    const criterio = this.repos.criterio.buscarPorId(id)
    if (!criterio) throw new ErroNaoEncontrado('Critério não encontrado.')
    const salvo = this.repos.criterio.atualizar(criterio.id, { ativo: !criterio.ativo })!
    return { ok: true, criterio: salvo, editaisReavaliados: this.reavaliarEditais() }
  }

  /** Avalia um edital com os critérios atuais, sem gravar nada. */
  simular(editalId: unknown): SimulacaoResposta {
    if (!editalId) throw new ErroValidacao('Selecione um edital para simular.')
    try {
      return { ok: true, simulacao: this.simularAvaliacao(String(editalId)) }
    } catch (erro) {
      throw new ErroRegraNegocio(erro instanceof Error && erro.message ? erro.message : 'Não foi possível simular.')
    }
  }
}
