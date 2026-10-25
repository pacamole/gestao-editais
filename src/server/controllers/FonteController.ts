import { Router } from 'express'
import { fonteServico } from '../composicao.js'

export const rotasFontes = Router()

rotasFontes.get('/fontes', (_req, res) => {
  res.json(fonteServico.listar())
})

rotasFontes.post('/fontes', (req, res) => {
  res.json(fonteServico.salvar(req.body ?? {}))
})

rotasFontes.patch('/fontes/:id/ativo', (req, res) => {
  res.json(fonteServico.alternarAtivo(req.params.id))
})

rotasFontes.post('/fontes/:id/coletar', async (req, res) => {
  res.json(await fonteServico.coletar(req.params.id))
})
