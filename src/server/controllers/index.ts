import { Router } from 'express'
import { bootstrapServico } from '../composicao.js'
import { rotasAlertas } from './AlertaController.js'
import { rotasAuth } from './AuthController.js'
import { rotasBase } from './BaseController.js'
import { rotasChat } from './ChatController.js'
import { rotasConfigSistema } from './ConfigSistemaController.js'
import { rotasCriterios } from './CriterioController.js'
import { rotasDestinatarios } from './DestinatarioController.js'
import { rotasDashboard } from './DashboardController.js'
import { rotasEditais } from './EditalController.js'
import { rotasEntrada } from './EntradaController.js'
import { rotasExtracao } from './ExtracaoController.js'
import { rotasFontes } from './FonteController.js'
import { rotasPerfil } from './PerfilController.js'

// Todas as rotas da API, montadas em /api.
export const rotasApi = Router()

// Garante perfil, critérios e alertas padrão antes de qualquer requisição.
rotasApi.use((_req, _res, next) => {
  bootstrapServico.garantir()
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
