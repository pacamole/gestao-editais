import { Router } from 'express'
import { createHash, randomUUID } from 'node:crypto'
import { db, novoId, transacao } from '../db/index.js'
import { repositorios } from '../repositorios/index.js'
import type { Edital, StatusEdital, StatusElegibilidade, Modalidade, Classificacao } from '../entidades.js'
import { ELEGIBILIDADE, MODALIDADES, STATUS_EDITAL } from '../../shared/rotulos.js'

export const rotasEditais = Router()

// Auxiliar para obter ID do usuário (ou gestor padrão se não houver cookie)
function obterUsuarioId(req: any): string {
  const cookie = req.headers.cookie?.split(';').map((x: string) => x.trim()).find((x: string) => x.startsWith('sessao_bhrendon='))?.slice(16)
  if (cookie) {
    const row = db.prepare('SELECT usuario_id FROM sessao WHERE id=? AND expira_em > ?').get(cookie, new Date().toISOString()) as { usuario_id: string } | undefined
    if (row?.usuario_id) return row.usuario_id
  }
  const gestor = db.prepare("SELECT id FROM usuario WHERE papel='GESTOR' LIMIT 1").get() as { id: string } | undefined
  return gestor?.id ?? '00000000-0000-0000-0000-000000000001'
}

// ---- Fontes ----
rotasEditais.get('/fontes', (_req, res) => {
  const fontes = repositorios.fonte.listar()
  res.json({ fontes })
})

// ---- Dashboard (P02 - Tarefa 14) ----
rotasEditais.get('/dashboard', (_req, res) => {
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
  ).all() as any[]

  const editaisUrgentes = editaisUrgentesRaw.map((e) => {
    const prazoDate = new Date(e.prazo_inscricao)
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
  ).all()

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
  })
})

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
  })
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
  })
})

// ---- Nova Entrada (P05 - Tarefa 13) ----
rotasEditais.post('/editais', (req, res) => {
  const { tipo = 'MANUAL' } = req.body ?? {}
  const agoraIso = new Date().toISOString()

  // 1. Upload de PDF (arrastar e soltar com limite de 20 MB)
  if (tipo === 'UPLOAD_PDF') {
    const { arquivo_base64, nome_arquivo, fonte_id } = req.body

    if (!arquivo_base64 || typeof arquivo_base64 !== 'string') {
      return res.status(400).json({ erro: 'Arquivo PDF não fornecido.' })
    }

    // Validação estrita do limite de 20 MB
    const buffer = Buffer.from(arquivo_base64, 'base64')
    const limiteBytes = 20 * 1024 * 1024
    if (buffer.length > limiteBytes) {
      return res.status(400).json({
        erro: `O arquivo enviado (${(buffer.length / (1024 * 1024)).toFixed(1)} MB) excede o limite máximo permitido de 20 MB.`,
      })
    }

    // Calcula hash SHA-256 do documento
    const hash = createHash('sha256').update(buffer).digest('hex')

    // Deduplicação: se o edital já existir pelo hash, avisa e devolve o existente
    const duplicado = repositorios.edital.buscarDuplicado({
      hash_documento: hash,
      url_documento: null,
      numero_edital: null,
      orgao_financiador: null,
    })

    if (duplicado) {
      return res.json({
        ok: true,
        id: duplicado.id,
        duplicado: true,
        mensagem: 'Edital já cadastrado com o mesmo documento.',
      })
    }

    const fonteValida = fonte_id || repositorios.fonte.buscarPorNome('Upload manual')?.id || repositorios.fonte.listar()[0]?.id
    const nomeLimpo = (nome_arquivo || 'Edital Importado')
      .replace(/\.pdf$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim()
    const titulo = nomeLimpo.length > 5 ? nomeLimpo : `Edital via Upload - ${nomeLimpo}`

    const novoEdital = repositorios.edital.inserir({
      id: novoId(),
      titulo,
      fonte_id: fonteValida,
      hash_documento: hash,
      status: 'COLETADO',
      texto_extraido: `[Texto extraído do documento PDF: ${nome_arquivo || 'edital.pdf'}]`,
      retificado: false,
    })

    // Avaliação preliminar
    repositorios.avaliacao.inserir({
      id: novoId(),
      edital_id: novoEdital.id,
      status_elegibilidade: 'INDETERMINADO',
      nota_fit: 50,
      classificacao: 'MEDIO',
      criterios_violados: null,
      criterios_indeterminados: [
        {
          criterio_id: 'leitura_pendente',
          nome: 'Análise de documento em processamento',
          campo_faltante: 'Dados em extração',
        },
      ],
      detalhamento_pontuacao: null,
      nota_ajustada_manual: null,
      ajustada_por: null,
      perfil_atualizado_em: null,
    })

    return res.json({ ok: true, id: novoEdital.id })
  }

  // 2. Colagem de URL do edital
  if (tipo === 'URL') {
    const { url, fonte_id } = req.body

    if (!url || !String(url).trim()) {
      return res.status(400).json({ erro: 'Endereço URL do edital é obrigatório.' })
    }

    const urlLimpa = String(url).trim()
    if (!/^https?:\/\//i.test(urlLimpa)) {
      return res.status(400).json({ erro: 'Informe uma URL válida iniciando com http:// ou https://.' })
    }

    // Deduplicação por URL
    const duplicado = repositorios.edital.buscarDuplicado({
      hash_documento: null,
      url_documento: urlLimpa,
      numero_edital: null,
      orgao_financiador: null,
    })

    if (duplicado) {
      return res.json({
        ok: true,
        id: duplicado.id,
        duplicado: true,
        mensagem: 'Edital já cadastrado com esta URL de origem.',
      })
    }

    let dominio = 'Portal de Fomento'
    try {
      dominio = new URL(urlLimpa).hostname.replace(/^www\./i, '')
    } catch {}

    const fonteValida = fonte_id || repositorios.fonte.buscarPorNome('URL manual')?.id || repositorios.fonte.listar()[0]?.id
    const titulo = `Chamada Pública identificada em ${dominio}`

    const novoEdital = repositorios.edital.inserir({
      id: novoId(),
      titulo,
      fonte_id: fonteValida,
      url_original: urlLimpa,
      url_documento: urlLimpa,
      status: 'COLETADO',
      retificado: false,
    })

    repositorios.avaliacao.inserir({
      id: novoId(),
      edital_id: novoEdital.id,
      status_elegibilidade: 'INDETERMINADO',
      nota_fit: 50,
      classificacao: 'MEDIO',
      criterios_violados: null,
      criterios_indeterminados: null,
      detalhamento_pontuacao: null,
      nota_ajustada_manual: null,
      ajustada_por: null,
      perfil_atualizado_em: null,
    })

    return res.json({ ok: true, id: novoEdital.id })
  }

  // 3. Cadastro manual dos campos
  const {
    titulo,
    orgao_financiador,
    numero_edital,
    modalidade,
    fonte_id,
    data_publicacao,
    prazo_inscricao,
    data_resultado_prevista,
    valor_total_disponivel,
    valor_maximo_por_projeto,
    exige_contrapartida,
    percentual_contrapartida,
    publico_alvo,
    cnaes_aceitos,
    portes_aceitos,
    natureza_juridica_aceita,
    abrangencia_geografica,
    exige_ict_parceira,
    tempo_minimo_fundacao_meses,
    faturamento_minimo,
    faturamento_maximo,
    certidoes_exigidas,
    areas_tematicas,
    permite_submissao_multipla,
    resumo_executivo,
  } = req.body

  if (!titulo || !String(titulo).trim()) {
    return res.status(400).json({ erro: 'O título do edital é obrigatório.' })
  }

  const fonteValida = fonte_id || repositorios.fonte.listar()[0]?.id

  const editalManual = repositorios.edital.inserir({
    id: novoId(),
    titulo: String(titulo).trim(),
    orgao_financiador: orgao_financiador ? String(orgao_financiador).trim() : null,
    numero_edital: numero_edital ? String(numero_edital).trim() : null,
    modalidade: modalidade || null,
    fonte_id: fonteValida,
    data_publicacao: data_publicacao || null,
    prazo_inscricao: prazo_inscricao || null,
    data_resultado_prevista: data_resultado_prevista || null,
    valor_total_disponivel: valor_total_disponivel != null && valor_total_disponivel !== '' ? Number(valor_total_disponivel) : null,
    valor_maximo_por_projeto: valor_maximo_por_projeto != null && valor_maximo_por_projeto !== '' ? Number(valor_maximo_por_projeto) : null,
    exige_contrapartida: typeof exige_contrapartida === 'boolean' ? exige_contrapartida : null,
    percentual_contrapartida: percentual_contrapartida != null && percentual_contrapartida !== '' ? Number(percentual_contrapartida) : null,
    publico_alvo: Array.isArray(publico_alvo) ? publico_alvo : typeof publico_alvo === 'string' && publico_alvo ? publico_alvo.split(',').map((s) => s.trim()) : null,
    cnaes_aceitos: Array.isArray(cnaes_aceitos) ? cnaes_aceitos : typeof cnaes_aceitos === 'string' && cnaes_aceitos ? cnaes_aceitos.split(',').map((s) => s.trim()) : null,
    portes_aceitos: Array.isArray(portes_aceitos) ? portes_aceitos : typeof portes_aceitos === 'string' && portes_aceitos ? portes_aceitos.split(',').map((s) => s.trim()) : null,
    natureza_juridica_aceita: Array.isArray(natureza_juridica_aceita) ? natureza_juridica_aceita : typeof natureza_juridica_aceita === 'string' && natureza_juridica_aceita ? natureza_juridica_aceita.split(',').map((s) => s.trim()) : null,
    abrangencia_geografica: Array.isArray(abrangencia_geografica) ? abrangencia_geografica : typeof abrangencia_geografica === 'string' && abrangencia_geografica ? abrangencia_geografica.split(',').map((s) => s.trim()) : null,
    exige_ict_parceira: typeof exige_ict_parceira === 'boolean' ? exige_ict_parceira : null,
    tempo_minimo_fundacao_meses: tempo_minimo_fundacao_meses != null && tempo_minimo_fundacao_meses !== '' ? Number(tempo_minimo_fundacao_meses) : null,
    faturamento_minimo: faturamento_minimo != null && faturamento_minimo !== '' ? Number(faturamento_minimo) : null,
    faturamento_maximo: faturamento_maximo != null && faturamento_maximo !== '' ? Number(faturamento_maximo) : null,
    certidoes_exigidas: Array.isArray(certidoes_exigidas) ? certidoes_exigidas : typeof certidoes_exigidas === 'string' && certidoes_exigidas ? certidoes_exigidas.split(',').map((s) => s.trim()) : null,
    areas_tematicas: Array.isArray(areas_tematicas) ? areas_tematicas : typeof areas_tematicas === 'string' && areas_tematicas ? areas_tematicas.split(',').map((s) => s.trim()) : null,
    permite_submissao_multipla: typeof permite_submissao_multipla === 'boolean' ? permite_submissao_multipla : null,
    resumo_executivo: resumo_executivo ? String(resumo_executivo).trim() : null,
    status: 'ANALISADO',
    retificado: false,
  })

  // Calcula fit preliminar para cadastro manual
  let notaFit = 75
  let elegibilidadeCalc: StatusElegibilidade = 'ELEGIVEL'
  let classificacao: Classificacao = 'ALTO'

  if (editalManual.areas_tematicas?.some((a) => /esg|bateria|energia|sustentabilidade/i.test(a))) {
    notaFit = 85
  }

  repositorios.avaliacao.inserir({
    id: novoId(),
    edital_id: editalManual.id,
    status_elegibilidade: elegibilidadeCalc,
    nota_fit: notaFit,
    classificacao,
    criterios_violados: null,
    criterios_indeterminados: null,
    detalhamento_pontuacao: [
      { criterio_id: 'cadastro_manual', peso: 10, pontuacao: 0.8, contribuicao: notaFit },
    ],
    nota_ajustada_manual: null,
    ajustada_por: null,
    perfil_atualizado_em: null,
  })

  res.json({ ok: true, id: editalManual.id })
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
  })
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
    edital: repositorios.edital.buscarPorId(edital.id),
  })
})
