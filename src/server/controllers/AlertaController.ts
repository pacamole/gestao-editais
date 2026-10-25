import { Router } from 'express'
import { alertaServico } from '../composicao.js'

export const rotasAlertas = Router()

rotasAlertas.get('/alertas', (_req, res) => {
  res.json(alertaServico.listar())
})

rotasAlertas.post('/alertas', (req, res) => {
  res.json(alertaServico.salvar(req.body?.configuracoes))
})

rotasAlertas.post('/alertas/:tipo/simular', async (req, res) => {
  res.json(await alertaServico.simular(req.params.tipo, req.body?.destinatarios))
})

rotasAlertas.get('/alertas/logs', (_req, res) => {
  res.json(alertaServico.logs())
})
