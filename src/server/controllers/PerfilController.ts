import { Router } from 'express'
import { perfilServico } from '../composicao.js'

export const rotasPerfil = Router()

rotasPerfil.get('/perfil-empresa', (_req, res) => {
  res.json(perfilServico.obter())
})

rotasPerfil.post('/perfil-empresa', (req, res) => {
  res.json(perfilServico.salvar(req.body ?? {}))
})
