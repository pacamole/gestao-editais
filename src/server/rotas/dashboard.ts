import { Router } from 'express'
import { db } from '../db/index.js'
import type { DashboardResposta, EditalResumoDashboard, EditalTopFit } from '../../shared/tipos/dashboard.js'

export const rotasDashboard = Router()

rotasDashboard.get('/dashboard', (_req, res) => {
  const agoraIso = new Date().toISOString()
  const hojeStr = agoraIso.slice(0, 10)
  const seteDiasAtras = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const seteDiasFrenteStr = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)

  // 1. Quatro cartões de contagem
  // Novos esta semana: criado_em nos últimos 7 dias
  const novosSemana = (
    db.prepare('SELECT COUNT(*) as n FROM edital WHERE criado_em >= ?').get(seteDiasAtras) as { n: number }
  ).n

  // Aguardando revisão: status ANALISADO ou EM_REVISAO
  const aguardandoRevisao = (
    db.prepare("SELECT COUNT(*) as n FROM edital WHERE status IN ('ANALISADO', 'EM_REVISAO')").get() as { n: number }
  ).n

  // Aprovados sem inscrição: status APROVADO
  const aprovadosSemInscricao = (
    db.prepare("SELECT COUNT(*) as n FROM edital WHERE status = 'APROVADO'").get() as { n: number }
  ).n

  // Prazo em até 7 dias: editais ativos com prazo_inscricao entre hoje e daqui a 7 dias
  const prazoUrgente = (
    db.prepare(
      `SELECT COUNT(*) as n FROM edital
       WHERE status NOT IN ('DESCARTADO', 'ENCERRADO', 'EXPIRADO')
         AND prazo_inscricao IS NOT NULL
         AND prazo_inscricao >= ?
         AND prazo_inscricao <= ?`
    ).get(hojeStr, seteDiasFrenteStr) as { n: number }
  ).n

  // 2. Cinco editais mais urgentes (menor prazo restante com status ativo)
  const editaisUrgentesRaw = db.prepare(
    `SELECT e.*, f.nome as fonte_nome,
            a.status_elegibilidade, a.nota_fit, a.classificacao, a.nota_ajustada_manual
     FROM edital e
     LEFT JOIN fonte f ON e.fonte_id = f.id
     LEFT JOIN avaliacao a ON a.id = (
       SELECT id FROM avaliacao WHERE edital_id = e.id ORDER BY calculado_em DESC LIMIT 1
     )
     WHERE e.status NOT IN ('DESCARTADO', 'ENCERRADO', 'EXPIRADO')
       AND e.prazo_inscricao IS NOT NULL
     ORDER BY e.prazo_inscricao ASC
     LIMIT 5`
  ).all() as EditalResumoDashboard[]

  const editaisUrgentes = editaisUrgentesRaw.map((e) => {
    const prazoDate = new Date(e.prazo_inscricao!) // a consulta filtra prazo nulo
    const hojeDate = new Date()
    hojeDate.setHours(0, 0, 0, 0)
    prazoDate.setHours(0, 0, 0, 0)
    const diffDias = Math.ceil((prazoDate.getTime() - hojeDate.getTime()) / (1000 * 3600 * 24))
    return {
      ...e,
      dias_restantes: diffDias,
      urgente: diffDias >= 0 && diffDias <= 7,
    }
  })

  // 3. Top 5 de maior nota de fit (elegíveis ainda não decididos)
  const topFit = db.prepare(
    `SELECT e.*, f.nome as fonte_nome,
            a.status_elegibilidade, a.nota_fit, a.classificacao, a.nota_ajustada_manual
     FROM edital e
     JOIN avaliacao a ON a.id = (
       SELECT id FROM avaliacao WHERE edital_id = e.id ORDER BY calculado_em DESC LIMIT 1
     )
     LEFT JOIN fonte f ON e.fonte_id = f.id
     WHERE a.status_elegibilidade = 'ELEGIVEL'
       AND e.status NOT IN ('APROVADO', 'DESCARTADO', 'INSCRITO', 'ENCERRADO', 'EXPIRADO')
     ORDER BY COALESCE(a.nota_ajustada_manual, a.nota_fit, 0) DESC
     LIMIT 5`
  ).all() as EditalTopFit[]

  // 4. Distribuição por classificação (Alto / Médio / Baixo fit)
  const dist = db.prepare(
    `SELECT
       COUNT(CASE WHEN COALESCE(a.classificacao, '') = 'ALTO' OR COALESCE(a.nota_ajustada_manual, a.nota_fit) >= 70 THEN 1 END) as alto,
       COUNT(CASE WHEN (COALESCE(a.classificacao, '') = 'MEDIO' OR (COALESCE(a.nota_ajustada_manual, a.nota_fit) >= 40 AND COALESCE(a.nota_ajustada_manual, a.nota_fit) < 70)) AND COALESCE(a.nota_ajustada_manual, a.nota_fit) < 70 THEN 1 END) as medio,
       COUNT(CASE WHEN COALESCE(a.classificacao, '') = 'BAIXO' OR COALESCE(a.nota_ajustada_manual, a.nota_fit) < 40 THEN 1 END) as baixo,
       COUNT(*) as total
     FROM avaliacao a
     WHERE a.id IN (
       SELECT MAX(id) FROM avaliacao GROUP BY edital_id
     )`
  ).get() as { alto: number; medio: number; baixo: number; total: number }

  // 5. Painel de saúde da coleta (última execução de cada fonte)
  const fontes = db.prepare('SELECT * FROM fonte ORDER BY nome').all() as any[]
  const saudeColeta = fontes.map((f) => {
    const ultExec = db.prepare(
      'SELECT * FROM coleta_execucao WHERE fonte_id = ? ORDER BY iniciada_em DESC LIMIT 1'
    ).get(f.id) as any | undefined

    return {
      fonte_id: f.id,
      nome: f.nome,
      tipo: f.tipo,
      ativo: Boolean(f.ativo),
      ultima_coleta_em: f.ultima_coleta_em ?? ultExec?.finalizada_em ?? null,
      status: f.ultimo_status ?? ultExec?.status ?? (f.ativo ? 'PENDENTE' : 'INATIVO'),
      mensagem_erro: f.ultima_mensagem_erro ?? ultExec?.mensagem_erro ?? null,
      itens_coletados: ultExec?.itens_coletados ?? 0,
    }
  })

  res.json({
    cartoes: {
      novosSemana,
      aguardandoRevisao,
      aprovadosSemInscricao,
      prazoUrgente,
    },
    editaisUrgentes,
    topFit,
    distribuicao: dist ?? { alto: 0, medio: 0, baixo: 0, total: 0 },
    saudeColeta,
  } satisfies DashboardResposta)
})
