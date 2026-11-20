import { Router } from 'express'
import { configSistemaServico } from '../composicao.js'

export const rotasConfigSistema = Router()

rotasConfigSistema.get('/config/sistema', (_req, res) => {
  res.json(configSistemaServico.obter())
})

rotasConfigSistema.put('/config/sistema', (req, res) => {
  res.json(configSistemaServico.salvar(req.body))
})

rotasConfigSistema.post('/config/sistema/testar-email', async (req, res) => {
  res.json(await configSistemaServico.testarEmail(req.body?.para))
})

rotasConfigSistema.post('/config/sistema/testar-ollama', async (req, res) => {
  res.json(await configSistemaServico.testarOllama(req.body))
})

rotasConfigSistema.post('/config/sistema/conexoes-ia', async (req, res) => {
  res.json(await configSistemaServico.salvarConexaoIa(req.body))
})

rotasConfigSistema.delete('/config/sistema/conexoes-ia/:id', (req, res) => {
  res.json(configSistemaServico.removerConexaoIa(req.params.id))
})

rotasConfigSistema.post('/config/sistema/modelos-ia', async (req, res) => {
  res.json(await configSistemaServico.listarModelosIa(req.body))
})
