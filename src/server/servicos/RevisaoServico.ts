import { transacao } from '../db/index.js'
import type { Edital } from '../dominio/entidades.js'
import { ErroNaoEncontrado, ErroRegraNegocio, ErroValidacao } from '../dominio/erros.js'
import type { Repositorios } from '../repositorios/index.js'
import { ehAcaoTransicao, transicionar, type AcaoTransicao } from '../../shared/statusEdital.js'
import type { RevisarResposta } from '../../shared/tipos/edital.js'
import type { LoteIgnorado, LoteResposta } from '../../shared/tipos/editais.js'

type RepositoriosRevisao = Pick<Repositorios, 'edital' | 'revisao'>

const ACAO_DO_LOTE = { APROVAR: 'APROVOU', DESCARTAR: 'DESCARTOU' } as const satisfies Record<string, AcaoTransicao>

// Decisões sobre um edital (aprovar, descartar, inscrever…). A máquina de status diz o que é permitido.
export class RevisaoServico {
  constructor(private readonly repos: RepositoriosRevisao) {}

  revisar(editalId: string, acao: unknown, comentario: unknown, usuarioId: string): RevisarResposta {
    const edital = this.repos.edital.buscarPorId(editalId)
    if (!edital) throw new ErroNaoEncontrado('Edital não encontrado.')
    if (!ehAcaoTransicao(acao)) throw new ErroValidacao('Ação inválida.')

    const texto = typeof comentario === 'string' ? comentario.trim() : ''
    if (acao === 'DESCARTOU' && !texto) throw new ErroValidacao('Informe um comentário para descartar.')

    const resultado = transicionar(edital.status, acao)
    if (!resultado.ok) throw new ErroRegraNegocio(resultado.motivo)

    const revisao = transacao(() => this.aplicar(edital, acao, resultado.novo, texto || null, usuarioId))
    return { revisao, edital: this.repos.edital.buscarPorId(edital.id)! }
  }

  /** Aplica a ação nos editais que permitem e informa, com o motivo, os que foram ignorados. */
  revisarLote(ids: unknown, acao: unknown, comentario: unknown, usuarioId: string): LoteResposta {
    if (!Array.isArray(ids) || !ids.length) throw new ErroValidacao('Selecione ao menos um edital para ação em lote.')
    if (acao !== 'APROVAR' && acao !== 'DESCARTAR') throw new ErroValidacao('Ação em lote inválida. Use APROVAR ou DESCARTAR.')

    const justificativa = typeof comentario === 'string' ? comentario.trim() : ''
    if (acao === 'DESCARTAR' && !justificativa) throw new ErroValidacao('Justificativa obrigatória para descarte em lote.')

    const acaoRevisao = ACAO_DO_LOTE[acao]
    const ignorados: LoteIgnorado[] = []
    let aplicados = 0

    transacao(() => {
      for (const id of new Set(ids.map(String))) {
        const edital = this.repos.edital.buscarPorId(id)
        if (!edital) {
          ignorados.push({ id, titulo: null, motivo: 'Edital não encontrado.' })
          continue
        }
        const resultado = transicionar(edital.status, acaoRevisao)
        if (!resultado.ok) {
          ignorados.push({ id, titulo: edital.titulo, motivo: resultado.motivo })
          continue
        }
        this.aplicar(edital, acaoRevisao, resultado.novo, justificativa || null, usuarioId)
        aplicados++
      }
    })

    return { ok: true, aplicados, ignorados, status: acao === 'APROVAR' ? 'APROVADO' : 'DESCARTADO' }
  }

  private aplicar(edital: Edital, acao: AcaoTransicao, novo: Edital['status'], comentario: string | null, usuarioId: string) {
    this.repos.edital.atualizar(edital.id, { status: novo })
    return this.repos.revisao.inserir({
      edital_id: edital.id,
      usuario_id: usuarioId,
      acao,
      comentario,
      valor_anterior: edital.status,
      valor_novo: novo,
    })
  }
}
