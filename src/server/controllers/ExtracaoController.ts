import { Router } from 'express'
import { avaliacaoServico, processamentoEditalServico, triagemElegibilidadeServico } from '../composicao.js'

export const rotasExtracao = Router()

rotasExtracao.post('/editais/:id/triagem-elegibilidade', async (req, res) => {
  const analise = await triagemElegibilidadeServico.analisar(req.params.id)
  const avaliacao = avaliacaoServico.registrarTriagem(req.params.id, analise.status)
  res.json({ analise, avaliacao })
})

rotasExtracao.post('/editais/:id/extrair-dados', async (req, res) => {
  res.json(await processamentoEditalServico.lerSobDemanda(req.params.id, 'TEXTO'))
})

rotasExtracao.post('/editais/:id/ler-url', async (req, res) => {
  res.json(await processamentoEditalServico.lerSobDemanda(req.params.id, 'URL'))
})
