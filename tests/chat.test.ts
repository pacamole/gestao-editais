import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { TextoFormatado } from '../src/client/components/TextoFormatado.js'
import { ErroOllama, extrairCamposDoEdital, responderSobreEdital } from '../src/server/chat/ollama.js'
import { buscarTrechosEdital } from '../src/server/chat/indiceEdital.js'
import type { PerfilEmpresa } from '../src/server/dominio/entidades.js'

test('renderiza negrito, parágrafos e listas com elementos seguros', () => {
  const html = renderToStaticMarkup(
    createElement(TextoFormatado, {
      texto: '**Prazo:** até 30 de junho.\nConfira *a seção 2*.\n\n- Documento A\n- Documento B\n\n<script>alert(1)</script>',
    }),
  )
  assert.match(html, /<strong>Prazo:<\/strong>/)
  assert.match(html, /<br\/>/)
  assert.match(html, /<em>a seção 2<\/em>/)
  assert.match(html, /<ul><li>Documento A<\/li><li>Documento B<\/li><\/ul>/)
  assert.match(html, /&lt;script&gt;/)
  assert.doesNotMatch(html, /<script>/)
})

test('seleciona passagens para extração estruturada e preserva a paginação', () => {
  const edital = [
    '[Página 1]\n' + 'Introdução geral. '.repeat(500),
    '[Página 2]\n' + 'Regras de orçamento. '.repeat(500),
    '[Página 3]\nO prazo de inscrição termina em 30 de junho.',
    '[Página 4]\n' + 'Informações administrativas. '.repeat(500),
  ].join('\n')

  const busca = buscarTrechosEdital('edital-grande', edital, 'Qual é o prazo de inscrição?')
  assert.ok(busca.trechos.length <= 9_000)
  assert.equal(busca.relevante, true)
  assert.match(busca.trechos, /\[Página 3\]/)
  assert.match(busca.trechos, /30 de junho/)
  assert.doesNotMatch(busca.trechos, /\[Página 2\]/)
})

test('envia perguntas fora do edital ao modelo e mantém o cache de extração atualizado', async () => {
  const documento = `[Página 1]\n${'Conteúdo do edital. '.repeat(900)}\n[Fonte URL: https://example.org]\nTrecho final do documento completo.`
  let mensagens: { role: string; content: string }[] = []
  const resposta = await responderSobreEdital(documento, 'Quanto é 2 + 2?', [], async (_url, init) => {
    const corpo = JSON.parse(String(init?.body)) as { messages: { role: string; content: string }[] }
    mensagens = corpo.messages
    return new Response(`${JSON.stringify({ message: { content: '2 + 2 é igual a 4.' } })}\n`)
  })
  assert.equal(resposta, '2 + 2 é igual a 4.')
  assert.match(mensagens[0].content, /responda normalmente com seu conhecimento geral/)
  assert.match(mensagens[0].content, /Trecho final do documento completo\./)

  const primeiraVersao = buscarTrechosEdital('edital-cache', '[Página 1]\nO prazo é 30 de junho.', 'prazo')
  const documentoAtualizado = buscarTrechosEdital('edital-cache', '[Página 1]\nOs documentos exigidos são RG e CPF.', 'documentos')
  assert.match(primeiraVersao.trechos, /prazo/)
  assert.match(documentoAtualizado.trechos, /documentos exigidos/)
})

test('envia o documento completo, a pergunta e apenas as seis últimas mensagens ao Ollama', async () => {
  let url: URL | undefined
  let requisicao: Record<string, unknown> | undefined
  const historico = Array.from({ length: 8 }, (_, indice) => ({
    papel: indice % 2 === 0 ? 'USUARIO' as const : 'ASSISTENTE' as const,
    conteudo: `mensagem ${indice + 1}`,
  }))

  const resposta = await responderSobreEdital(
    `[Página 1]\nO prazo termina em 30 de junho.\n${'Texto adicional do edital. '.repeat(400)}\n[Fonte URL: https://example.org]\nFim do documento.`,
    'Qual é o prazo?',
    historico,
    async (destino, init) => {
      url = new URL(String(destino))
      requisicao = JSON.parse(String(init?.body)) as Record<string, unknown>
      return new Response(`${JSON.stringify({ message: { content: 'O prazo termina em 30 de junho.' } })}\n`)
    },
  )

  assert.equal(resposta, 'O prazo termina em 30 de junho.')
  assert.equal(url?.href, 'http://localhost:11434/api/chat')
  assert.equal(requisicao?.model, 'gemma2:latest')
  assert.equal(requisicao?.stream, true)
  assert.equal((requisicao?.options as { num_ctx: number }).num_ctx, 8192)
  assert.equal((requisicao?.options as { num_predict: number }).num_predict, 2048)

  const mensagens = requisicao?.messages as { role: string; content: string }[]
  assert.equal(mensagens.length, 8)
  assert.equal(mensagens[0].role, 'system')
  assert.match(mensagens[0].content, /O prazo termina em 30 de junho/)
  assert.match(mensagens[0].content, /responda de forma detalhada/)
  assert.match(mensagens[0].content, /reproduza uma frase literal|Cite a página/)
  assert.match(mensagens[0].content, /Página 1/)
  assert.match(mensagens[0].content, /Fim do documento\./)
  assert.deepEqual(
    mensagens.slice(1).map(({ role, content }) => [role, content]),
    [
      ['user', 'mensagem 3'],
      ['assistant', 'mensagem 4'],
      ['user', 'mensagem 5'],
      ['assistant', 'mensagem 6'],
      ['user', 'mensagem 7'],
      ['assistant', 'mensagem 8'],
      ['user', 'Qual é o prazo?'],
    ],
  )
})

test('reporta erros HTTP do Ollama sem fingir que obteve uma resposta', async () => {
  await assert.rejects(
    responderSobreEdital(
      '[Página 1]\nO prazo de inscrição é 30 de junho.',
      'Qual é o prazo de inscrição?',
      [],
      async () => new Response('modelo não instalado', { status: 404 }),
    ),
    (erro: unknown) => erro instanceof ErroOllama && erro.statusCode === 503,
  )
})

test('rejeita resposta vazia do Ollama', async () => {
  await assert.rejects(
    responderSobreEdital('[Página 1]\nO prazo de inscrição é 30 de junho.', 'Qual é o prazo?', [], async () =>
      new Response(`${JSON.stringify({ message: { content: '  ' } })}\n`),
    ),
    (erro: unknown) => erro instanceof ErroOllama && erro.statusCode === 502,
  )
})

test('extrai e valida campos estruturados usando somente evidências literais do edital', async () => {
  let requisicao: Record<string, unknown> | undefined
  const texto = [
    '[Página 1]',
    'A Fundação Aurora financia a Chamada 12/2026, modalidade subvenção.',
    'As inscrições encerram em 30/11/2026.',
  ].join('\n')
  const resultado = await extrairCamposDoEdital('edital-extracao', texto, async (_url, init) => {
    requisicao = JSON.parse(String(init?.body)) as Record<string, unknown>
    return Response.json({
      message: {
        content: JSON.stringify({
          orgao_financiador: { valor: 'Fundação Aurora', evidencia: 'A Fundação Aurora financia' },
          prazo_inscricao: { valor: '2026-11-30', evidencia: 'As inscrições encerram em 30/11/2026.' },
          valor_total_disponivel: { valor: 120000, evidencia: 'O documento não contém esse trecho.' },
          exige_contrapartida: { valor: true, evidencia: 'A Fundação Aurora financia' },
        }),
      },
    })
  })

  assert.equal(requisicao?.stream, false)
  assert.equal(requisicao?.format, 'json')
  assert.deepEqual(resultado.campos, {
    orgao_financiador: 'Fundação Aurora',
    prazo_inscricao: '2026-11-30',
    exige_contrapartida: true,
  })
  assert.equal(resultado.evidencias.orgao_financiador?.pagina, 1)
  assert.equal(resultado.evidencias.prazo_inscricao?.trecho, 'As inscrições encerram em 30/11/2026.')
})

test('não inventa campos sem citação encontrada no texto do edital', async () => {
  const resultado = await extrairCamposDoEdital(
    'edital-sem-evidencia',
    '[Página 1]\nTexto sobre o objeto da chamada.',
    async () => Response.json({
      message: {
        content: JSON.stringify({
          valor_maximo_por_projeto: { valor: 50000, evidencia: 'O valor máximo será de R$ 50.000.' },
          exige_contrapartida: { valor: 'sim', evidencia: 'contrapartida obrigatória' },
        }),
      },
    }),
  )

  assert.deepEqual(resultado.campos, {})
  assert.deepEqual(resultado.evidencias, {})
})

test('usa conteúdo de URL como fonte de evidência estruturada', async () => {
  const texto = '[Fonte URL: https://example.org/edital]\nAs inscrições para a chamada terminam em 30 de novembro de 2026.'
  const resultado = await extrairCamposDoEdital('edital-web', texto, async () =>
    Response.json({
      message: {
        content: JSON.stringify({
          prazo_inscricao: {
            valor: '2026-11-30',
            evidencia: 'As inscrições para a chamada terminam em 30 de novembro de 2026.',
          },
        }),
      },
    }),
  )

  assert.equal(resultado.campos.prazo_inscricao, '2026-11-30')
  assert.equal(resultado.evidencias.prazo_inscricao?.pagina, null)
})

test('considera o perfil da empresa ao responder sobre compatibilidade com o edital', async () => {
  let instrucao = ''
  const perfil: PerfilEmpresa = {
    id: 1,
    razao_social: 'Empresa Exemplo Ltda.',
    nome_fantasia: 'Exemplo',
    cnpj: '00.000.000/0000-00',
    cnae_principal: '6201-5/00',
    cnaes_secundarios: ['7210-0/00'],
    porte: 'ME',
    natureza_juridica: 'Sociedade Empresária Limitada',
    data_fundacao: '2020-01-01',
    faturamento_anual: 4200000,
    uf: 'PR',
    municipio: 'Curitiba',
    areas_atuacao: ['Energia', 'Inovação'],
    palavras_chave: ['baterias', 'sustentabilidade'],
    possui_ict_parceira: true,
    certidoes_disponiveis: ['CND', 'FGTS'],
    capacidade_contrapartida_percentual: 30,
    valor_minimo_interesse: 500000,
    prazo_minimo_preparo_dias: 30,
    atualizado_em: '2026-10-12T00:00:00.000Z',
  }

  await responderSobreEdital(
    '[Página 1]\nA chamada aceita empresas do Paraná e exige parceria com ICT.',
    'A empresa é compatível com esta chamada?',
    [],
    async (_url, init) => {
      const requisicao = JSON.parse(String(init?.body)) as { messages: { content: string }[] }
      instrucao = requisicao.messages[0].content
      return new Response(`${JSON.stringify({ message: { content: 'Compatível.' } })}\n`)
    },
    perfil,
  )

  assert.match(instrucao, /PERFIL ATUAL DA EMPRESA/)
  assert.match(instrucao, /6201-5\/00/)
  assert.match(instrucao, /Curitiba/)
  assert.match(instrucao, /compare os requisitos do edital/)
  assert.doesNotMatch(instrucao, /00\.000\.000\/0000-00/)
})
