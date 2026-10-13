import test from 'node:test'
import assert from 'node:assert/strict'
import { lerPaginaPublica } from '../src/server/coleta/pagina.js'

const resolverPublico = async () => [{ address: '93.184.216.34', family: 4 }]

test('lê o texto principal de uma página pública, preservando título e URL de origem', async () => {
  const pagina = await lerPaginaPublica(
    'https://example.org/edital',
    async () => new Response(
      '<html><head><title>Chamada de Inovação</title></head><body><nav>Menu sem relação</nav><main><h1>Chamada Pública 12/2026</h1><p>As inscrições para projetos de inovação terminam em 30 de novembro de 2026. Consulte os critérios completos no regulamento.</p></main></body></html>',
      { headers: { 'content-type': 'text/html; charset=utf-8' } },
    ),
    resolverPublico,
  )

  assert.equal(pagina.titulo, 'Chamada de Inovação')
  assert.match(pagina.texto, /^\[Fonte URL: https:\/\/example\.org\/edital\]/)
  assert.match(pagina.texto, /inscrições para projetos de inovação/)
  assert.doesNotMatch(pagina.texto, /Menu sem relação/)
})

test('bloqueia IPs locais e redirecionamentos para destinos privados', async () => {
  await assert.rejects(
    lerPaginaPublica('http://127.0.0.1/admin', async () => {
      throw new Error('fetch não deveria ser chamado')
    }),
    /endereços públicos/,
  )

  let chamadas = 0
  await assert.rejects(
    lerPaginaPublica(
      'https://example.org/',
      async () => {
        chamadas++
        return new Response(null, { status: 302, headers: { location: 'http://192.168.1.1/admin' } })
      },
      resolverPublico,
    ),
    /endereços públicos/,
  )
  assert.equal(chamadas, 1)
})

test('rejeita conteúdo não HTML/PDF e páginas sem conteúdo textual suficiente', async () => {
  await assert.rejects(
    lerPaginaPublica(
      'https://example.org/file.json',
      async () => new Response('{}', { headers: { 'content-type': 'application/json' } }),
      resolverPublico,
    ),
    /não retornou uma página HTML/,
  )

  await assert.rejects(
    lerPaginaPublica(
      'https://example.org/empty',
      async () => new Response('<html><body><main><p>Curto.</p></main></body></html>', { headers: { 'content-type': 'text/html' } }),
      resolverPublico,
    ),
    /texto suficiente/,
  )
})
