import { db } from '../db/index.js'
import type { CartoesDashboard, DistribuicaoFit, EditalResumoDashboard, EditalTopFit } from '../../shared/tipos/dashboard.js'

const ENCERRADOS = "('DESCARTADO', 'ENCERRADO', 'EXPIRADO', 'FORA_DO_PERFIL')"

const JUNCAO_AVALIACAO = `
  LEFT JOIN fonte f ON e.fonte_id = f.id`

const AVALIACAO_VIGENTE = `a.id = (SELECT id FROM avaliacao WHERE edital_id = e.id ORDER BY calculado_em DESC LIMIT 1)`

export type FonteComExecucao = {
  fonte_id: string
  nome: string
  tipo: string
  ativo: boolean
  ultima_coleta_em: string | null
  ultimo_status: string | null
  ultima_mensagem_erro: string | null
  ultima_execucao: { status: string | null; finalizada_em: string | null; mensagem_erro: string | null; itens_coletados: number } | null
}

const contar = (sql: string, ...params: (string | number)[]) => (db.prepare(sql).get(...params) as { n: number }).n

// Consultas de leitura do painel inicial. Não são de uma tabela só, por isso não herdam de Repositorio.
export class DashboardRepositorio {
  contagens(criadosDesde: string, hoje: string, ate: string): CartoesDashboard {
    return {
      novosSemana: contar("SELECT COUNT(*) as n FROM edital WHERE criado_em >= ? AND status <> 'FORA_DO_PERFIL'", criadosDesde),
      aguardandoRevisao: contar("SELECT COUNT(*) as n FROM edital WHERE status IN ('ANALISADO', 'EM_REVISAO')"),
      aprovadosSemInscricao: contar("SELECT COUNT(*) as n FROM edital WHERE status = 'APROVADO'"),
      prazoUrgente: contar(
        `SELECT COUNT(*) as n FROM edital
         WHERE status NOT IN ${ENCERRADOS}
           AND prazo_inscricao IS NOT NULL
           AND prazo_inscricao >= ?
           AND prazo_inscricao <= ?`,
        hoje,
        ate,
      ),
    }
  }

  /** Os editais em andamento com o prazo mais próximo. */
  maisUrgentes(limite: number): EditalResumoDashboard[] {
    return db
      .prepare(
        `SELECT e.*, f.nome as fonte_nome,
                a.status_elegibilidade, a.nota_fit, a.classificacao, a.nota_ajustada_manual
         FROM edital e
         ${JUNCAO_AVALIACAO}
         LEFT JOIN avaliacao a ON ${AVALIACAO_VIGENTE}
         WHERE e.status NOT IN ${ENCERRADOS}
           AND e.prazo_inscricao IS NOT NULL
         ORDER BY e.prazo_inscricao ASC
         LIMIT ?`,
      )
      .all(limite) as EditalResumoDashboard[]
  }

  /** Elegíveis ainda não decididos, com as maiores notas. */
  maioresNotas(limite: number): EditalTopFit[] {
    return db
      .prepare(
        `SELECT e.*, f.nome as fonte_nome,
                a.status_elegibilidade, a.nota_fit, a.classificacao, a.nota_ajustada_manual
         FROM edital e
         JOIN avaliacao a ON ${AVALIACAO_VIGENTE}
         ${JUNCAO_AVALIACAO}
         WHERE a.status_elegibilidade = 'ELEGIVEL'
           AND e.status NOT IN ('APROVADO', 'DESCARTADO', 'INSCRITO', 'ENCERRADO', 'EXPIRADO')
         ORDER BY COALESCE(a.nota_ajustada_manual, a.nota_fit, 0) DESC
         LIMIT ?`,
      )
      .all(limite) as EditalTopFit[]
  }

  distribuicaoPorFit(): DistribuicaoFit | undefined {
    return db
      .prepare(
        `SELECT
           COUNT(CASE WHEN COALESCE(a.classificacao, '') = 'ALTO' OR COALESCE(a.nota_ajustada_manual, a.nota_fit) >= 70 THEN 1 END) as alto,
           COUNT(CASE WHEN (COALESCE(a.classificacao, '') = 'MEDIO' OR (COALESCE(a.nota_ajustada_manual, a.nota_fit) >= 40 AND COALESCE(a.nota_ajustada_manual, a.nota_fit) < 70)) AND COALESCE(a.nota_ajustada_manual, a.nota_fit) < 70 THEN 1 END) as medio,
           COUNT(CASE WHEN COALESCE(a.classificacao, '') = 'BAIXO' OR COALESCE(a.nota_ajustada_manual, a.nota_fit) < 40 THEN 1 END) as baixo,
           COUNT(*) as total
         FROM avaliacao a
         WHERE a.id IN (SELECT MAX(id) FROM avaliacao GROUP BY edital_id)`,
      )
      .get() as DistribuicaoFit | undefined
  }

  /** Cada fonte com o resultado da última execução de coleta. */
  totalEditais(): number {
    return contar('SELECT COUNT(*) as n FROM edital')
  }

  fontesComUltimaExecucao(): FonteComExecucao[] {
    // Só as fontes monitoradas: upload, link e cadastro manual não têm busca, e excluída não aparece.
    const fontes = db
      .prepare("SELECT * FROM fonte WHERE tipo IN ('SCRAPER', 'RSS') AND removida_em IS NULL ORDER BY nome")
      .all() as Record<string, unknown>[]
    return fontes.map((f) => {
      const execucao = db
        .prepare('SELECT * FROM coleta_execucao WHERE fonte_id = ? ORDER BY iniciada_em DESC LIMIT 1')
        .get(f.id as string) as Record<string, unknown> | undefined
      return {
        fonte_id: f.id as string,
        nome: f.nome as string,
        tipo: f.tipo as string,
        ativo: Boolean(f.ativo),
        ultima_coleta_em: (f.ultima_coleta_em as string | null) ?? null,
        ultimo_status: (f.ultimo_status as string | null) ?? null,
        ultima_mensagem_erro: (f.ultima_mensagem_erro as string | null) ?? null,
        ultima_execucao: execucao
          ? {
              status: (execucao.status as string | null) ?? null,
              finalizada_em: (execucao.finalizada_em as string | null) ?? null,
              mensagem_erro: (execucao.mensagem_erro as string | null) ?? null,
              itens_coletados: Number(execucao.itens_coletados ?? 0),
            }
          : null,
      }
    })
  }
}
