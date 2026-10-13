import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { TextoFormatado } from '../src/client/components/TextoFormatado.js'
import { ErroOllama, responderSobreEdital } from '../src/server/chat/ollama.js'
import { buscarTrechosEdital } from '../src/server/chat/indiceEdital.js'

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

test('seleciona páginas relevantes e limita o contexto para editais extensos', () => {
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

test('recusa perguntas fora do edital sem chamar o modelo e invalida o índice quando o documento muda', async () => {
  const resposta = await responderSobreEdital(
    '[Página 1]\nO prazo de inscrição termina em 30 de junho.',
    'Quanto é 2 + 2?',
    [],
    async () => {
      throw new Error('O modelo não deveria ser chamado para uma pergunta fora do escopo')
    },
  )
  assert.match(resposta, /fora do escopo/)

  const primeiraVersao = buscarTrechosEdital('edital-cache', '[Página 1]\nO prazo é 30 de junho.', 'prazo')
  const documentoAtualizado = buscarTrechosEdital('edital-cache', '[Página 1]\nOs documentos exigidos são RG e CPF.', 'documentos')
  assert.match(primeiraVersao.trechos, /prazo/)
  assert.match(documentoAtualizado.trechos, /documentos exigidos/)
})

test('envia texto do edital, pergunta e apenas as seis últimas mensagens ao Ollama', async () => {
  let url: URL | undefined
  let requisicao: Record<string, unknown> | undefined
  const historico = Array.from({ length: 8 }, (_, indice) => ({
    papel: indice % 2 === 0 ? 'USUARIO' as const : 'ASSISTENTE' as const,
    conteudo: `mensagem ${indice + 1}`,
  }))

  const resposta = await responderSobreEdital(
    '[Página 1]\nO prazo termina em 30 de junho.',
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
  assert.equal((requisicao?.options as { num_predict: number }).num_predict, 512)

  const mensagens = requisicao?.messages as { role: string; content: string }[]
  assert.equal(mensagens.length, 8)
  assert.equal(mensagens[0].role, 'system')
  assert.match(mensagens[0].content, /O prazo termina em 30 de junho/)
  assert.match(mensagens[0].content, /reproduza uma frase literal/)
  assert.match(mensagens[0].content, /Página 1/)
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
