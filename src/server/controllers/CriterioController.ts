import { Router } from 'express'
import { criterioServico } from '../composicao.js'

export const rotasCriterios = Router()

rotasCriterios.get('/criterios', (_req, res) => {
  res.json(criterioServico.listar())
})

rotasCriterios.post('/criterios', (req, res) => {
  res.json(criterioServico.salvar(req.body ?? {}))
})

rotasCriterios.delete('/criterios/:id', (req, res) => {
  res.json(criterioServico.excluir(req.params.id))
})

rotasCriterios.patch('/criterios/:id/ativo', (req, res) => {
  res.json(criterioServico.alternarAtivo(req.params.id))
})

rotasCriterios.post('/criterios/reordenar', (req, res) => {
  res.json(criterioServico.reordenar(req.body?.ids))
})

rotasCriterios.post('/criterios/simular', (req, res) => {
  res.json(criterioServico.simular(req.body?.edital_id))
})
