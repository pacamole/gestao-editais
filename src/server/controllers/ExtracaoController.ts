import { Router } from 'express'
import { extracaoServico } from '../composicao.js'

export const rotasExtracao = Router()

rotasExtracao.post('/editais/:id/extrair-dados', async (req, res) => {
  res.json(await extracaoServico.extrairDados(req.params.id))
})

rotasExtracao.post('/editais/:id/ler-url', async (req, res) => {
  res.json(await extracaoServico.lerUrl(req.params.id))
})
