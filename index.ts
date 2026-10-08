import './env.js'
import express, { type ErrorRequestHandler } from 'express'
import path from 'node:path'
import type { ErroApi, HealthResponse } from '../shared/api.js'
import { Agendador } from './agendador.js'
import { bancoVazio } from './db/index.js'
import { tarefasNotificacao } from './notificacao/index.js'
import { root } from './paths.js'
import { rotasBase } from './rotas/base.js'
import { rotasAuth } from './rotas/auth.js'
import { rotasEditais } from './rotas/editais.js'

const isProd = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT ?? 3000)

if (bancoVazio()) {
  console.error('Banco não criado. Rode `npm run db:reset` (base nova) ou `npm run db:importar -- arquivo.db`.')
  process.exit(1)
}

const app = express()
app.use(express.json())

// ---- API ----
app.get('/api/health', (_req, res) => {
  const body: HealthResponse = { ok: true, time: new Date().toISOString() }
  res.json(body)
})

app.use('/api/auth', rotasAuth)
app.use('/api/editais', rotasEditais)
app.use('/api/base', rotasBase)

const tratarErro: ErrorRequestHandler = (erro, _req, res, _next) => {
  console.error(erro)
  const corpo: ErroApi = { erro: 'Erro interno do servidor.' }
  res.status(500).json(corpo)
}
app.use('/api', tratarErro)

// ---- Front-end ----
if (isProd) {
  const clientDir = path.join(root, 'dist/client')
  app.use(express.static(clientDir))
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDir, 'index.html')))
} else {
  const { createServer } = await import('vite')
  const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'spa' })
  app.use(vite.middlewares)
}

app.listen(port, () => {
  console.log(`http://localhost:${port}`)
  new Agendador(tarefasNotificacao).iniciar()
})
