import { Router } from 'express'
import { db, novoId, transacao } from '../db/index.js'
import { obterUsuarioId } from '../auth/sessao.js'
import { repositorios } from '../repositorios/index.js'
import type { Edital, StatusEdital } from '../dominio/entidades.js'
import { MARCADOR_EDICAO_MANUAL, validarCamposManuais, type CampoEditavel } from '../dominio/validacaoCamposEdital.js'
import { ELEGIBILIDADE, MODALIDADES, STATUS_EDITAL } from '../../shared/rotulos.js'
import type { ListaEditaisResposta, LoteResposta } from '../../shared/tipos/editais.js'
import type { DetalheEditalResposta, RevisarResposta, SalvarCamposResposta } from '../../shared/tipos/edital.js'

export const rotasEditais = Router()

// ---- Lista de Editais (P03 - Tarefa 12) ----
rotasEditais.get('/editais', (req, res) => {
  const {
    busca,
    status,
    elegibilidade,
    faixaFit,
    modalidade,
    fonte_id,
    prazoDe,
    prazoAte,
    somentePrazoAberto,
    novosSemana,
    prazoUrgente,
    formato,
  } = req.query

  const pagina = Math.max(1, Number(req.query.pagina ?? 1))
  const limite = Math.max(1, Math.min(100, Number(req.query.limite ?? 10)))
  const offset = (pagina - 1) * limite

  const condicoes: string[] = []
  const params: any[] = []

  // Busca textual por título, órgão financiador ou número
  if (busca && String(busca).trim()) {
    const termo = `%${String(busca).trim().toLowerCase()}%`
    condicoes.push('(LOWER(e.titulo) LIKE ? OR LOWER(COALESCE(e.orgao_financiador, "")) LIKE ? OR LOWER(COALESCE(e.numero_edital, "")) LIKE ?)')
    params.push(termo, termo, termo)
  }

  // Filtro de status (suporta múltiplos separados por vírgula, ex: ANALISADO,EM_REVISAO)
  if (status && String(status).trim() && String(status) !== 'TODOS') {
    const listaStatus = String(status).split(',').map((s) => s.trim()).filter(Boolean)
    if (listaStatus.length === 1) {
      condicoes.push('e.status = ?')
      params.push(listaStatus[0])
    } else if (listaStatus.length > 1) {
      condicoes.push(`e.status IN (${listaStatus.map(() => '?').join(', ')})`)
      params.push(...listaStatus)
    }
  }

  // Filtro de elegibilidade
  if (elegibilidade && String(elegibilidade).trim() && String(elegibilidade) !== 'TODAS') {
    condicoes.push('a.status_elegibilidade = ?')
    params.push(String(elegibilidade).trim())
  }

  // Filtro de faixa de nota
  if (faixaFit && String(faixaFit).trim() && String(faixaFit) !== 'TODAS') {
    const f = String(faixaFit).trim().toUpperCase()
    if (f === 'ALTO') {
      condicoes.push('COALESCE(a.nota_ajustada_manual, a.nota_fit, 0) >= 70')
    } else if (f === 'MEDIO') {
      condicoes.push('COALESCE(a.nota_ajustada_manual, a.nota_fit, 0) >= 40 AND COALESCE(a.nota_ajustada_manual, a.nota_fit, 0) < 70')
    } else if (f === 'BAIXO') {
      condicoes.push('COALESCE(a.nota_ajustada_manual, a.nota_fit, 0) < 40 AND COALESCE(a.nota_ajustada_manual, a.nota_fit) IS NOT NULL')
    }
  }

  // Filtro por modalidade
  if (modalidade && String(modalidade).trim() && String(modalidade) !== 'TODAS') {
    condicoes.push('e.modalidade = ?')
    params.push(String(modalidade).trim())
  }

  // Filtro por fonte
  if (fonte_id && String(fonte_id).trim() && String(fonte_id) !== 'TODAS') {
    condicoes.push('e.fonte_id = ?')
    params.push(String(fonte_id).trim())
  }

  // Intervalo de prazo
  if (prazoDe && String(prazoDe).trim()) {
    condicoes.push('e.prazo_inscricao >= ?')
    params.push(String(prazoDe).trim())
  }
  if (prazoAte && String(prazoAte).trim()) {
    condicoes.push('e.prazo_inscricao <= ?')
    params.push(String(prazoAte).trim())
  }

  // Somente com prazo aberto
  const hojeStr = new Date().toISOString().slice(0, 10)
  if (somentePrazoAberto === '1' || somentePrazoAberto === 'true') {
    condicoes.push("e.prazo_inscricao >= ? AND e.status NOT IN ('EXPIRADO', 'ENCERRADO', 'DESCARTADO')")
    params.push(hojeStr)
  }

  // Novos na semana
  if (novosSemana === '1' || novosSemana === 'true') {
    const seteDiasAtras = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
    condicoes.push('e.criado_em >= ?')
    params.push(seteDiasAtras)
  }

  // Prazo em até 7 dias
  if (prazoUrgente === '1' || prazoUrgente === 'true') {
    const seteDiasFrenteStr = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    condicoes.push("e.prazo_inscricao >= ? AND e.prazo_inscricao <= ? AND e.status NOT IN ('EXPIRADO', 'ENCERRADO', 'DESCARTADO')")
    params.push(hojeStr, seteDiasFrenteStr)
  }

  const whereClausula = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''

  // Ordenação padrão da especificação:
  // 1º elegibilidade (ELEGIVEL = 1, INDETERMINADO = 2, INELEGIVEL = 3, sem avaliação = 4)
  // 2º nota de fit decrescente
  // 3º prazo crescente
  const ordemClausula = `
    ORDER BY
      CASE
        WHEN a.status_elegibilidade = 'ELEGIVEL' THEN 1
        WHEN a.status_elegibilidade = 'INDETERMINADO' THEN 2
        WHEN a.status_elegibilidade = 'INELEGIVEL' THEN 3
        ELSE 4
      END ASC,
      COALESCE(a.nota_ajustada_manual, a.nota_fit, -1) DESC,
      CASE
        WHEN e.prazo_inscricao IS NULL THEN '9999-99-99'
        ELSE e.prazo_inscricao
      END ASC
  `

  // Contagem total para paginação
  const total = (
    db.prepare(
      `SELECT COUNT(*) as n
       FROM edital e
       LEFT JOIN avaliacao a ON a.id = (
         SELECT id FROM avaliacao WHERE edital_id = e.id ORDER BY calculado_em DESC LIMIT 1
       )
       ${whereClausula}`
    ).get(...params) as { n: number }
  ).n

  // Se exportação CSV requerida
  if (formato === 'csv') {
    const sqlExport = `
      SELECT e.*, f.nome as fonte_nome,
             a.status_elegibilidade, a.nota_fit, a.nota_ajustada_manual
      FROM edital e
      LEFT JOIN fonte f ON e.fonte_id = f.id
      LEFT JOIN avaliacao a ON a.id = (
        SELECT id FROM avaliacao WHERE edital_id = e.id ORDER BY calculado_em DESC LIMIT 1
      )
      ${whereClausula}
      ${ordemClausula}
    `
    const linhas = db.prepare(sqlExport).all(...params) as any[]

    const escapeCsv = (str: any) => {
      if (str == null) return '""'
      const s = String(str).replace(/"/g, '""')
      return `"${s}"`
    }

    const cabecalhoCsv = [
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

    const linhasCsv = linhas.map((l) => {
      const nota = l.nota_ajustada_manual ?? l.nota_fit ?? ''
      const eleg = ELEGIBILIDADE[l.status_elegibilidade] ?? l.status_elegibilidade ?? 'Sem avaliação'
      const mod = MODALIDADES[l.modalidade] ?? l.modalidade ?? ''
      const st = STATUS_EDITAL[l.status] ?? l.status ?? ''
      const valor = l.valor_maximo_por_projeto != null ? l.valor_maximo_por_projeto.toLocaleString('pt-BR') : ''

      return [
        escapeCsv(l.titulo),
        escapeCsv(l.orgao_financiador),
        escapeCsv(mod),
        escapeCsv(l.prazo_inscricao),
        escapeCsv(valor),
        escapeCsv(eleg),
        escapeCsv(nota),
        escapeCsv(st),
        escapeCsv(l.fonte_nome),
      ].join(';')
    })

    const csvCompleto = '\uFEFF' + [cabecalhoCsv, ...linhasCsv].join('\r\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="editais-filtrados.csv"')
    return res.send(csvCompleto)
  }

  // Consulta paginada
  const sqlBusca = `
    SELECT e.*, f.nome as fonte_nome,
           a.status_elegibilidade, a.nota_fit, a.classificacao, a.nota_ajustada_manual
    FROM edital e
    LEFT JOIN fonte f ON e.fonte_id = f.id
    LEFT JOIN avaliacao a ON a.id = (
      SELECT id FROM avaliacao WHERE edital_id = e.id ORDER BY calculado_em DESC LIMIT 1
    )
    ${whereClausula}
    ${ordemClausula}
    LIMIT ? OFFSET ?
  `
  const itensRaw = db.prepare(sqlBusca).all(...params, limite, offset) as any[]

  const hojeDate = new Date()
  hojeDate.setHours(0, 0, 0, 0)

  const itens = itensRaw.map((e) => {
    let dias_restantes: number | null = null
    let prazo_urgente = false

    if (e.prazo_inscricao) {
      const prazoDate = new Date(e.prazo_inscricao)
      prazoDate.setHours(0, 0, 0, 0)
      dias_restantes = Math.ceil((prazoDate.getTime() - hojeDate.getTime()) / (1000 * 3600 * 24))
      prazo_urgente = dias_restantes >= 0 && dias_restantes <= 7
    }

    return {
      ...e,
      dias_restantes,
      prazo_urgente,
    }
  })

  res.json({
    itens,
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite),
  } satisfies ListaEditaisResposta)
})

// ---- Ações em lote (Aprovar / Descartar - Tarefa 12) ----
rotasEditais.post('/editais/lote', (req, res) => {
  const { ids, acao, comentario } = req.body ?? {}

  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ erro: 'Selecione ao menos um edital para ação em lote.' })
  }

  if (acao !== 'APROVAR' && acao !== 'DESCARTAR') {
    return res.status(400).json({ erro: 'Ação em lote inválida. Use APROVAR ou DESCARTAR.' })
  }

  if (acao === 'DESCARTAR' && (!comentario || !String(comentario).trim())) {
    return res.status(400).json({ erro: 'Justificativa obrigatória para descarte em lote.' })
  }

  const usuarioId = obterUsuarioId(req)
  const novoStatus: StatusEdital = acao === 'APROVAR' ? 'APROVADO' : 'DESCARTADO'
  const acaoRevisao = acao === 'APROVAR' ? 'APROVOU' : 'DESCARTOU'
  const justificativa = comentario ? String(comentario).trim() : null
  const agoraIso = new Date().toISOString()

  transacao(() => {
    for (const id of ids) {
      const editalAtual = db.prepare('SELECT status FROM edital WHERE id = ?').get(id) as { status: StatusEdital } | undefined
      if (editalAtual) {
        db.prepare('UPDATE edital SET status = ?, atualizado_em = ? WHERE id = ?').run(novoStatus, agoraIso, id)
        db.prepare(
          `INSERT INTO revisao (id, edital_id, usuario_id, acao, valor_anterior, valor_novo, comentario, criado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(novoId(), id, usuarioId, acaoRevisao, editalAtual.status, novoStatus, justificativa, agoraIso)
      }
    }
  })

  res.json({
    ok: true,
    total: ids.length,
    status: novoStatus,
  } satisfies LoteResposta)
})

// ---- Detalhe do Edital (P04) ----
rotasEditais.get('/editais/:id', (req, res) => {
  const edital = repositorios.edital.buscarPorId(req.params.id)
  if (!edital) return res.status(404).json({ erro: 'Edital não encontrado.' })

  const avaliacao = repositorios.avaliacao.ultimaDoEdital(edital.id) ?? null
  const evidencias = repositorios.evidencia.listarDoEdital(edital.id)
  const revisoes = repositorios.revisao.listarDoEdital(edital.id)

  res.json({
    edital,
    avaliacao,
    evidencias,
    revisoes,
  } satisfies DetalheEditalResposta)
})

rotasEditais.patch('/editais/:id/campos', (req, res) => {
  const edital = repositorios.edital.buscarPorId(req.params.id)
  if (!edital) return res.status(404).json({ erro: 'Edital não encontrado.' })

  let alteracoes: Partial<Edital>
  try {
    alteracoes = validarCamposManuais(req.body?.campos)
  } catch (erro) {
    return res.status(400).json({ erro: erro instanceof Error ? erro.message : 'Os campos informados são inválidos.' })
  }

  const camposAtualizados = Object.keys(alteracoes) as CampoEditavel[]
  const atualizado = transacao(() => {
    const registro = repositorios.edital.atualizar(edital.id, alteracoes)
    for (const campo of camposAtualizados) {
      repositorios.evidencia.excluirDoCampo(edital.id, campo)
      repositorios.evidencia.inserir({
        id: novoId(),
        edital_id: edital.id,
        campo,
        trecho_literal: MARCADOR_EDICAO_MANUAL,
        pagina: null,
        confianca: null,
      })
    }
    return registro
  })

  return res.json({
    edital: atualizado!,
    campos: camposAtualizados,
    mensagem: 'Dados atualizados manualmente.',
  } satisfies SalvarCamposResposta)
})

// ---- Ação de revisão individual ----
rotasEditais.post('/editais/:id/revisao', (req, res) => {
  const edital = repositorios.edital.buscarPorId(req.params.id)
  if (!edital) return res.status(404).json({ erro: 'Edital não encontrado.' })

  const { acao, comentario } = req.body ?? {}
  if (!['APROVOU', 'DESCARTOU', 'MARCOU_INSCRITO', 'REGISTROU_RESULTADO', 'AJUSTOU_NOTA'].includes(acao)) {
    return res.status(400).json({ erro: 'Ação inválida.' })
  }

  if (acao === 'DESCARTOU' && (!comentario || !String(comentario).trim())) {
    return res.status(400).json({ erro: 'Informe um comentário para descartar.' })
  }

  const mapaStatus: Record<string, StatusEdital> = {
    APROVOU: 'APROVADO',
    DESCARTOU: 'DESCARTADO',
    MARCOU_INSCRITO: 'INSCRITO',
    REGISTROU_RESULTADO: 'ENCERRADO',
  }

  const novoStatus = mapaStatus[acao]
  const agoraIso = new Date().toISOString()
  const usuarioId = obterUsuarioId(req)

  if (novoStatus) {
    repositorios.edital.atualizar(edital.id, { status: novoStatus })
  }

  const revisao = repositorios.revisao.inserir({
    id: novoId(),
    edital_id: edital.id,
    usuario_id: usuarioId,
    acao,
    comentario: comentario ? String(comentario).trim() : null,
    valor_anterior: edital.status,
    valor_novo: novoStatus ?? null,
  })

  res.json({
    revisao,
    edital: repositorios.edital.buscarPorId(edital.id)!,
  } satisfies RevisarResposta)
})
