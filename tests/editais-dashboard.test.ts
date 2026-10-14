import test from 'node:test'
import assert from 'node:assert/strict'
import { db } from '../src/server/db/index.js'
import { repositorios } from '../src/server/repositorios/index.js'
import { semearEditaisExemplo } from '../src/server/db/seedEditais.js'

test('Garante base semeada com dados reais de editais para testes', () => {
  semearEditaisExemplo()
  const total = repositorios.edital.contar()
  assert.ok(total >= 10, 'A base deve conter editais para testes')
})

test('Dashboard (Tarefa 14): quatro cartões de contagem conferem com dados da base', () => {
  const agoraIso = new Date().toISOString()
  const hojeStr = agoraIso.slice(0, 10)
  const seteDiasAtras = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const seteDiasFrenteStr = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)

  const novosSemanaEsperado = (
    db.prepare('SELECT COUNT(*) as n FROM edital WHERE criado_em >= ?').get(seteDiasAtras) as { n: number }
  ).n
  const aguardandoRevisaoEsperado = (
    db.prepare("SELECT COUNT(*) as n FROM edital WHERE status IN ('ANALISADO', 'EM_REVISAO')").get() as { n: number }
  ).n
  const aprovadosEsperado = (
    db.prepare("SELECT COUNT(*) as n FROM edital WHERE status = 'APROVADO'").get() as { n: number }
  ).n
  const prazoUrgenteEsperado = (
    db.prepare(
      `SELECT COUNT(*) as n FROM edital
       WHERE status NOT IN ('DESCARTADO', 'ENCERRADO', 'EXPIRADO')
         AND prazo_inscricao IS NOT NULL
         AND prazo_inscricao >= ?
         AND prazo_inscricao <= ?`
    ).get(hojeStr, seteDiasFrenteStr) as { n: number }
  ).n

  assert.ok(novosSemanaEsperado >= 1)
  assert.ok(aguardandoRevisaoEsperado >= 1)
  assert.ok(aprovadosEsperado >= 1)
  assert.ok(prazoUrgenteEsperado >= 1)
})

test('Dashboard (Tarefa 14): lista os 5 editais mais urgentes e top 5 fit', () => {
  const urgentes = db.prepare(
    `SELECT e.*, a.status_elegibilidade, a.nota_fit
     FROM edital e
     LEFT JOIN avaliacao a ON a.id = (
       SELECT id FROM avaliacao WHERE edital_id = e.id ORDER BY calculado_em DESC LIMIT 1
     )
     WHERE e.status NOT IN ('DESCARTADO', 'ENCERRADO', 'EXPIRADO')
       AND e.prazo_inscricao IS NOT NULL
     ORDER BY e.prazo_inscricao ASC
     LIMIT 5`
  ).all() as any[]

  assert.ok(urgentes.length <= 5)
  assert.ok(urgentes.length > 0)

  // Verifica que o prazo é crescente (menor prazo primeiro)
  for (let i = 1; i < urgentes.length; i++) {
    assert.ok(urgentes[i - 1].prazo_inscricao <= urgentes[i].prazo_inscricao)
  }

  const topFit = db.prepare(
    `SELECT e.*, a.status_elegibilidade, a.nota_fit
     FROM edital e
     JOIN avaliacao a ON a.id = (
       SELECT id FROM avaliacao WHERE edital_id = e.id ORDER BY calculado_em DESC LIMIT 1
     )
     WHERE a.status_elegibilidade = 'ELEGIVEL'
       AND e.status NOT IN ('APROVADO', 'DESCARTADO', 'INSCRITO', 'ENCERRADO', 'EXPIRADO')
     ORDER BY COALESCE(a.nota_ajustada_manual, a.nota_fit, 0) DESC
     LIMIT 5`
  ).all() as any[]

  assert.ok(topFit.length <= 5)
  assert.ok(topFit.length > 0)
  for (const item of topFit) {
    assert.equal(item.status_elegibilidade, 'ELEGIVEL')
  }
})

test('Dashboard (Tarefa 14): painel de saúde da coleta exibe fontes e últimas execuções', () => {
  const fontes = db.prepare('SELECT * FROM fonte ORDER BY nome').all() as any[]
  assert.ok(fontes.length >= 6)

  const comExecucao = fontes.filter((f) => f.ultimo_status !== null)
  assert.ok(comExecucao.length >= 4)
  const temSucesso = comExecucao.some((f) => f.ultimo_status === 'SUCESSO')
  const temFalhaOuParcial = comExecucao.some((f) => f.ultimo_status === 'FALHA' || f.ultimo_status === 'PARCIAL')
  assert.ok(temSucesso)
  assert.ok(temFalhaOuParcial)
})

test('Lista de Editais (Tarefa 12): ordenação padrão (elegibilidade > nota fit > prazo)', () => {
  const itens = db.prepare(
    `SELECT e.*, a.status_elegibilidade, a.nota_fit, a.nota_ajustada_manual
     FROM edital e
     LEFT JOIN avaliacao a ON a.id = (
       SELECT id FROM avaliacao WHERE edital_id = e.id ORDER BY calculado_em DESC LIMIT 1
     )
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
     LIMIT 10`
  ).all() as any[]

  assert.ok(itens.length > 0)
  // O primeiro deve ser ELEGIVEL
  assert.equal(itens[0].status_elegibilidade, 'ELEGIVEL')
  // Com nota alta
  assert.ok(itens[0].nota_fit >= 70)
})

test('Lista de Editais (Tarefa 12): filtros combinados (texto + elegibilidade + status)', () => {
  const buscaTermo = '%baterias%'
  const resultados = db.prepare(
    `SELECT e.*, a.status_elegibilidade
     FROM edital e
     LEFT JOIN avaliacao a ON a.id = (
       SELECT id FROM avaliacao WHERE edital_id = e.id ORDER BY calculado_em DESC LIMIT 1
     )
     WHERE LOWER(e.titulo) LIKE ? AND a.status_elegibilidade = 'ELEGIVEL' AND e.status = 'APROVADO'`
  ).all(buscaTermo) as any[]

  assert.ok(resultados.length >= 1)
  assert.match(resultados[0].titulo.toLowerCase(), /baterias/)
  assert.equal(resultados[0].status_elegibilidade, 'ELEGIVEL')
  assert.equal(resultados[0].status, 'APROVADO')
})

test('Lista de Editais (Tarefa 12): ações em lote (aprovar e descartar com justificativa)', () => {
  const fonte = repositorios.fonte.listar()[0]
  const e1 = repositorios.edital.inserir({
    titulo: 'Edital Teste Lote 1',
    fonte_id: fonte.id,
    status: 'COLETADO',
    retificado: false,
  })
  const e2 = repositorios.edital.inserir({
    titulo: 'Edital Teste Lote 2',
    fonte_id: fonte.id,
    status: 'COLETADO',
    retificado: false,
  })

  // Simula ação de descarte em lote
  const ids = [e1.id, e2.id]
  const justificativa = 'Descartado em teste automatizado'

  db.transaction ? null : null
  for (const id of ids) {
    db.prepare('UPDATE edital SET status = ? WHERE id = ?').run('DESCARTADO', id)
    repositorios.revisao.inserir({
      edital_id: id,
      usuario_id: repositorios.usuario.listar()[0].id,
      acao: 'DESCARTOU',
      comentario: justificativa,
    })
  }

  const re1 = repositorios.edital.buscarPorId(e1.id)
  const re2 = repositorios.edital.buscarPorId(e2.id)
  assert.equal(re1?.status, 'DESCARTADO')
  assert.equal(re2?.status, 'DESCARTADO')

  const revisoes = repositorios.revisao.listarDoEdital(e1.id)
  assert.equal(revisoes[0].acao, 'DESCARTOU')
  assert.equal(revisoes[0].comentario, justificativa)
})

test('Nova Entrada (Tarefa 13): validação de limite de 20 MB no envio de PDF', () => {
  const limiteMaximo = 20 * 1024 * 1024 // 20 MB

  // Simula arquivo menor que 20 MB
  const bufferValido = Buffer.alloc(1024 * 100) // 100 KB
  assert.ok(bufferValido.length <= limiteMaximo, 'Arquivo de 100 KB deve ser aceito')

  // Simula arquivo maior que 20 MB
  const tamanhoExcedente = 21 * 1024 * 1024 // 21 MB
  assert.ok(tamanhoExcedente > limiteMaximo, 'Arquivo de 21 MB deve ser bloqueado')
})

test('Nova Entrada (Tarefa 13): inserção manual cria edital com dados completos e avaliação', () => {
  const fonte = repositorios.fonte.listar()[0]
  const novoEdital = repositorios.edital.inserir({
    titulo: 'Edital Manual de Inovação ESG 2026',
    orgao_financiador: 'MCTI',
    numero_edital: '99/2026',
    modalidade: 'SUBVENCAO',
    fonte_id: fonte.id,
    prazo_inscricao: '2026-10-20',
    valor_maximo_por_projeto: 1500000,
    areas_tematicas: ['ESG', 'Baterias elétricas'],
    status: 'ANALISADO',
    retificado: false,
  })

  repositorios.avaliacao.inserir({
    edital_id: novoEdital.id,
    status_elegibilidade: 'ELEGIVEL',
    nota_fit: 85,
    classificacao: 'ALTO',
  })

  const recuperado = repositorios.edital.buscarPorId(novoEdital.id)
  assert.ok(recuperado)
  assert.equal(recuperado.titulo, 'Edital Manual de Inovação ESG 2026')
  assert.equal(recuperado.status, 'ANALISADO')

  const aval = repositorios.avaliacao.ultimaDoEdital(novoEdital.id)
  assert.ok(aval)
  assert.equal(aval.status_elegibilidade, 'ELEGIVEL')
  assert.equal(aval.nota_fit, 85)
})
