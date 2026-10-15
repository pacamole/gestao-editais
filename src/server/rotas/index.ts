import { Router } from 'express'
import { garantirBootstraps } from '../servicos/bootstrap.js'
import { rotasAlertas } from './alertas.js'
import { rotasAuth } from './auth.js'
import { rotasBase } from './base.js'
import { rotasChat } from './chat.js'
import { rotasConfigSistema } from './configSistema.js'
import { rotasCriterios } from './criterios.js'
import { rotasDestinatarios } from './destinatarios.js'
import { rotasDashboard } from './dashboard.js'
import { rotasEditais } from './editais.js'
import { rotasEntrada } from './entrada.js'
import { rotasExtracao } from './extracao.js'
import { rotasFontes } from './fontes.js'
import { rotasPerfil } from './perfil.js'

// Todas as rotas da API, montadas em /api.
export const rotasApi = Router()

// Garante perfil, critérios e alertas padrão antes de qualquer requisição.
rotasApi.use((_req, _res, next) => {
  garantirBootstraps()
  next()
})

rotasApi.use('/auth', rotasAuth)
rotasApi.use('/base', rotasBase)

rotasApi.use(rotasPerfil)
rotasApi.use(rotasCriterios)
rotasApi.use(rotasAlertas)
rotasApi.use(rotasConfigSistema)
rotasApi.use(rotasDestinatarios)
rotasApi.use(rotasFontes)
rotasApi.use(rotasDashboard)
rotasApi.use(rotasEditais)
rotasApi.use(rotasEntrada)
rotasApi.use(rotasExtracao)
rotasApi.use(rotasChat)
