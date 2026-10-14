import assert from 'node:assert/strict'
import { test, after } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ehMarcadorDeTextoPdf, extrairPdf } from '../src/server/coleta/pdf.js'
import { documentoPrincipal, listarPublicacoes } from '../src/server/coleta/portais.js'
import { Agendador, type EstadoRotina, type RegistroRotinas } from '../src/server/infra/agendador.js'

const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'gestao-editais-teste-'))
process.env.DATABASE_PATH = path.join(pasta, 'teste.db')
const { db } = await import('../src/server/db/index.js')
db.exec(fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'))
const { repositorios: repos } = await import('../src/server/repositorios/index.js')
const { ColetaServico } = await import('../src/server/coleta/servico.js')
const { expirarEditais, horaColeta } = await import('../src/server/coleta/rotinas.js')
after(() => { db.close(); fs.rmSync(pasta, { recursive: true, force: true }) })

// PDF mínimo válido de duas páginas; camada de texto opcional na segunda.
function pdf(texto: string, segunda = 'Segunda pagina'): Uint8Array {
  const stream = (s: string) => s ? `BT /F1 12 Tf 40 700 Td (${s}) Tj ET` : ''
  const a = stream(texto), b = stream(segunda)
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${a.length} >>\nstream\n${a}\nendstream`,
    `<< /Length ${b.length} >>\nstream\n${b}\nendstream`,
  ]
  let arquivo = '%PDF-1.4\n'
  const offsets = [0]
  objetos.forEach((o, i) => { offsets.push(arquivo.length); arquivo += `${i + 1} 0 obj\n${o}\nendobj\n` })
  const xref = arquivo.length
  arquivo += `xref\n0 8\n0000000000 65535 f \n${offsets.slice(1).map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(arquivo)
}

test('PDF: páginas físicas, texto e leitura manual em documento misto', async () => {
  const resultado = await extrairPdf(pdf('Primeira pagina'))
  assert.deepEqual(resultado.paginas.map((p) => p.pagina), [1, 2])
  assert.match(resultado.paginas[0].texto, /Primeira pagina/)
  assert.match(resultado.texto, /\[Página 2\]/)
  assert.equal(resultado.requerLeituraManual, false)
  assert.equal((await extrairPdf(pdf('Primeira pagina', ''))).requerLeituraManual, true)
  assert.equal((await extrairPdf(pdf('', ''))).requerLeituraManual, true)
  await assert.rejects(extrairPdf(Buffer.from('arquivo inválido')))
})

test('identifica marcadores antigos de upload sem confundir texto extraído real', () => {
  assert.equal(ehMarcadorDeTextoPdf('[Texto extraído do documento PDF: edital-antigo.pdf]'), true)
  assert.equal(ehMarcadorDeTextoPdf(' [Texto extraído do documento PDF: edital.pdf] '), true)
  assert.equal(ehMarcadorDeTextoPdf('[Página 1]\nTexto real do edital.'), false)
  assert.equal(ehMarcadorDeTextoPdf(null), false)
})

test('coletores separam chamadas de navegação, encerradas e anexos', () => {
  assert.equal(listarPublicacoes('FINEP', '<div class="tit_sep"><h2>Abertas</h2></div><div><a href="/component/chamadas_publicas/chamadapublica/1">Edital</a></div><div class="tit_sep"><h2>Encerradas</h2></div><div><a href="/component/chamadas_publicas/chamadapublica/2">Encerrada</a></div>', 'https://finep.gov.br').length, 1)
  assert.equal(listarPublicacoes('CNPq', '<nav><a href="/">Navegar</a></nav><div id="content-core"><h2 class="tileHeadline"><a href="/chamada">Chamada</a></h2></div>', 'https://gov.br').length, 1)
  assert.equal(listarPublicacoes('Embrapii', '<div class="single-chamada-publica"><p class="title-single-chamada-publica">Chamada 01</p><a href="/01">Documentos</a></div><div class="single-chamada-publica"><p class="title-single-chamada-publica">Resultado final</p><a href="/resultado">Documentos</a></div>', 'https://embrapii.org.br').length, 1)
  assert.equal(documentoPrincipal('<main><a href="/anexo.pdf">Anexo</a><a href="/edital.pdf">Edital</a></main>', 'https://gov.br'), 'https://gov.br/edital.pdf')
})

test('deduplicação por hash, URL, número/órgão e retificação por origem', async () => {
  const fonte = repos.fonte.inserir({ nome: 'FINEP', tipo: 'SCRAPER' })
  const servico = new ColetaServico(repos)
  const documento = { titulo: 'Chamada 01', urlOriginal: 'https://finep.gov.br/1', urlDocumento: 'https://finep.gov.br/1.pdf', numero: '01/2026' }
  const original = pdf('Original')
  assert.equal(await servico.registrar(fonte, documento, original), 'NOVO')
  assert.equal(await servico.registrar(fonte, { ...documento, urlDocumento: 'https://finep.gov.br/copia.pdf', urlOriginal: 'https://finep.gov.br/copia', numero: null }, original), 'DUPLICADO')
  assert.equal(await servico.registrar(fonte, documento, pdf('Retificado')), 'RETIFICADO')
  assert.equal(await servico.registrar(fonte, { ...documento, urlDocumento: 'https://finep.gov.br/novo.pdf' }, pdf('Outra versao')), 'RETIFICADO')
  assert.equal(await servico.registrar(fonte, { ...documento, urlOriginal: 'https://finep.gov.br/alternativo', urlDocumento: 'https://finep.gov.br/alternativo.pdf' }, pdf('Por numero')), 'RETIFICADO')
  assert.equal(repos.edital.contar(), 1)
  const edital = repos.edital.listar()[0]
  assert.equal(edital.retificado, true)
  assert.equal(edital.status, 'COLETADO')
  assert.equal(repos.editalVersao.listarDoEdital(edital.id).length, 3)
  assert.match(repos.editalVersao.listarDoEdital(edital.id).at(-1)!.dados.texto_extraido!, /Original/)
})

test('falha de item gera PARCIAL, mantém sucesso e registra a execução', async () => {
  const fonte = repos.fonte.inserir({ nome: 'CNPq', tipo: 'SCRAPER', url_base: 'https://teste/lista' })
  const baixar = async (url: string) => {
    if (url.endsWith('/lista')) return Buffer.from('<div id="content-core"><h2 class="tileHeadline"><a href="/bom">Chamada boa</a><a href="/ruim">Chamada ruim</a></h2></div>')
    if (url.endsWith('/bom')) return Buffer.from('<main><a href="/documento.pdf">Edital</a></main>')
    if (url.endsWith('.pdf')) return pdf('Coleta parcial')
    throw new Error('HTTP 503')
  }
  await assert.rejects(new ColetaServico(repos, baixar).coletar(fonte))
  const execucao = repos.coletaExecucao.ultimaDaFonte(fonte.id)!
  assert.equal(execucao.status, 'PARCIAL')
  assert.equal(execucao.itens_coletados, 1)
  assert.match(execucao.mensagem_erro!, /503/)
  assert.ok(execucao.finalizada_em)
})

test('rotinas retomam após dois dias e reinício, sem sobreposição ou repetição', async () => {
  const estados = new Map<string, EstadoRotina>([['coleta', { ultimoDia: '2026-10-09', historico: [] }]])
  const registro: RegistroRotinas = { obter: (n) => structuredClone(estados.get(n) ?? { historico: [] }), salvar: (n, e) => { estados.set(n, structuredClone(e)) } }
  let chamadas = 0
  const tarefas = [{ nome: 'coleta', recuperarAtrasada: true, deveRodar: () => false, executar: async () => { chamadas++ } }]
  const data = new Date('2026-10-11T08:00:00-03:00')
  const agendador = new Agendador(tarefas, 60_000, registro)
  await Promise.all([agendador.verificar(data), agendador.verificar(data)])
  await new Agendador(tarefas, 60_000, registro).verificar(data)
  assert.equal(chamadas, 1)
  assert.equal(estados.get('coleta')!.historico[0].status, 'SUCESSO')
  assert.equal(estados.get('coleta')!.ultimoDia, '2026-10-11')
})

test('falha de rotina é registrada e repetida após uma hora', async () => {
  let estado: EstadoRotina = { historico: [] }
  let chamadas = 0
  const registro: RegistroRotinas = { obter: () => structuredClone(estado), salvar: (_, e) => { estado = structuredClone(e) } }
  const tarefa = { nome: 'falha', deveRodar: () => true, executar: async () => { if (++chamadas === 1) throw new Error('offline') } }
  const agendador = new Agendador([tarefa], 60_000, registro)
  await agendador.verificar(new Date('2026-10-11T12:00:00Z'))
  await agendador.verificar(new Date('2026-10-11T12:01:00Z'))
  assert.equal(chamadas, 1)
  assert.equal(estado.historico[0].status, 'FALHA')
  await agendador.verificar(new Date('2026-10-11T13:00:00Z'))
  assert.equal(chamadas, 2)
  assert.equal(estado.ultimoDia, '2026-10-11')
})

test('primeira abertura antes do horário também recupera a coleta dois dias depois', async () => {
  let estado: EstadoRotina = { historico: [] }
  let chamadas = 0
  const registro: RegistroRotinas = { obter: () => structuredClone(estado), salvar: (_, e) => { estado = structuredClone(e) } }
  const tarefa = { nome: 'primeira', recuperarAtrasada: true, deveRodar: () => false, executar: async () => { chamadas++ } }
  await new Agendador([tarefa], 60_000, registro).verificar(new Date('2026-10-09T05:00:00-03:00'))
  assert.equal(chamadas, 0)
  await new Agendador([tarefa], 60_000, registro).verificar(new Date('2026-10-11T05:00:00-03:00'))
  assert.equal(chamadas, 1)
})

test('expiração respeita fim do dia, inscritos e decisões terminais', () => {
  const fonte = repos.fonte.listar()[0]
  for (const status of ['ANALISADO', 'APROVADO', 'INSCRITO', 'DESCARTADO', 'ENCERRADO'] as const) repos.edital.inserir({ titulo: status, fonte_id: fonte.id, status, prazo_inscricao: '2026-10-10' })
  const hoje = repos.edital.inserir({ titulo: 'Hoje', fonte_id: fonte.id, status: 'ANALISADO', prazo_inscricao: '2026-10-11' })
  assert.equal(expirarEditais(new Date('2026-10-11T08:00:00-03:00')), 2)
  assert.equal(repos.edital.buscarPorId(hoje.id)!.status, 'ANALISADO')
  assert.equal(repos.edital.listarPorStatus(['INSCRITO']).length, 1)
  assert.equal(horaColeta('30 6 * * *'), '06:30')
  assert.throws(() => horaColeta('0 25 * * *'))
})
