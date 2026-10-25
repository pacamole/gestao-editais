import { Router } from 'express'
import { dashboardServico } from '../composicao.js'

export const rotasDashboard = Router()

rotasDashboard.get('/dashboard', (_req, res) => {
  res.json(dashboardServico.painel())
})
