import { Router } from 'express'
import { processamentoEditalServico } from '../composicao.js'

export const rotasExtracao = Router()

rotasExtracao.post('/editais/:id/triagem-elegibilidade', async (req, res) => {
  res.json(await processamentoEditalServico.triarSobDemanda(req.params.id))
})

rotasExtracao.post('/editais/:id/extrair-dados', async (req, res) => {
  res.json(await processamentoEditalServico.lerSobDemanda(req.params.id, 'TEXTO'))
})

rotasExtracao.post('/editais/:id/ler-url', async (req, res) => {
  res.json(await processamentoEditalServico.lerSobDemanda(req.params.id, 'URL'))
})
