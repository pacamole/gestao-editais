import { Router } from 'express'
import { destinatarioServico } from '../composicao.js'

export const rotasDestinatarios = Router()

rotasDestinatarios.get('/destinatarios', (_req, res) => {
  res.json(destinatarioServico.listar())
})

rotasDestinatarios.post('/destinatarios', (req, res) => {
  res.status(201).json(destinatarioServico.adicionar(req.body?.email))
})

rotasDestinatarios.delete('/destinatarios/:email', (req, res) => {
  res.json(destinatarioServico.remover(req.params.email))
})
