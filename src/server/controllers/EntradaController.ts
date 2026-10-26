import { Router } from 'express'
import { entradaServico } from '../composicao.js'

export const rotasEntrada = Router()

// ---- Nova Entrada (P05): upload de PDF, link do edital ou cadastro manual ----
rotasEntrada.post('/editais', async (req, res) => {
  const corpo = req.body ?? {}
  switch (corpo.tipo ?? 'MANUAL') {
    case 'UPLOAD_PDF':
      return res.json(await entradaServico.criarPorUpload(corpo))
    case 'URL':
      return res.json(entradaServico.criarPorUrl(corpo))
    default:
      return res.json(await entradaServico.criarManual(corpo))
  }
})
