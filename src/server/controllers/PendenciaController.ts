import { Router } from 'express'
import { pendenciaServico } from '../composicao.js'

export const rotasPendencias = Router()

rotasPendencias.get('/pendencias', (_req, res) => {
  res.json(pendenciaServico.listar())
})
