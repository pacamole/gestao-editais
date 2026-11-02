import { Router } from 'express'
import { fonteServico } from '../composicao.js'

export const rotasFontes = Router()

rotasFontes.get('/fontes', (_req, res) => {
  res.json(fonteServico.listar())
})

rotasFontes.get('/fontes/origens', (_req, res) => {
  res.json(fonteServico.origens())
})

rotasFontes.post('/fontes', async (req, res) => {
  res.json(await fonteServico.salvar(req.body ?? {}))
})

rotasFontes.post('/fontes/verificar', async (req, res) => {
  res.json(await fonteServico.verificar(req.body ?? {}))
})

rotasFontes.post('/fontes/procurar-listagem', async (req, res) => {
  res.json(await fonteServico.procurarListagem(req.body ?? {}))
})

rotasFontes.patch('/fontes/:id/ativo', (req, res) => {
  res.json(fonteServico.alternarAtivo(req.params.id))
})

rotasFontes.delete('/fontes/:id', (req, res) => {
  res.json(fonteServico.excluir(req.params.id))
})

rotasFontes.post('/fontes/:id/coletar', async (req, res) => {
  res.json(await fonteServico.coletar(req.params.id))
})
