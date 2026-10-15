import { Router } from 'express'
import type { ErroApi } from '../../shared/api.js'
import { ErroParametroAlerta, normalizarDestinatarios } from '../../shared/catalogoAlertas.js'
import type { AlertasResposta, LogsAlertaResposta, SalvarAlertasResposta } from '../../shared/tipos/alertas.js'
import { transacao } from '../db/index.js'
import type { ConfigAlerta, TipoNotificacao } from '../dominio/entidades.js'
import { normalizarParametros, TIPOS_NOTIFICACAO } from '../notificacao/parametros.js'
import { repositorios } from '../repositorios/index.js'

export const rotasAlertas = Router()

const HISTORICO_LIMITE = 50

const configuracoesAtuais = () => TIPOS_NOTIFICACAO.map((tipo) => repositorios.configAlerta.obter(tipo))

rotasAlertas.get('/alertas', (_req, res) => {
  res.json({
    configuracoes: configuracoesAtuais(),
    logs: repositorios.notificacaoLog.recentes(HISTORICO_LIMITE),
    ultimos_envios: repositorios.notificacaoLog.ultimosEnvios(),
  } satisfies AlertasResposta)
})

// Valida um item e devolve a configuração pronta para gravar.
function normalizarConfig(item: unknown): ConfigAlerta {
  const { tipo, ativo, destinatarios, parametros } = (item ?? {}) as Record<string, unknown>
  if (!TIPOS_NOTIFICACAO.includes(tipo as TipoNotificacao)) throw new ErroParametroAlerta('Tipo de notificação inválido.')
  const t = tipo as TipoNotificacao
  try {
    return {
      tipo: t,
      ativo: Boolean(ativo),
      destinatarios: normalizarDestinatarios(destinatarios ?? []),
      parametros: normalizarParametros(t, parametros),
    }
  } catch (e) {
    if (e instanceof ErroParametroAlerta) throw new ErroParametroAlerta(`${t}: ${e.message}`)
    throw e
  }
}

rotasAlertas.post('/alertas', (req, res) => {
  const itens: unknown = req.body?.configuracoes
  if (!Array.isArray(itens) || !itens.length) {
    return res.status(400).json({ erro: 'Envie { configuracoes: [...] }.' } satisfies ErroApi)
  }

  let configs: ConfigAlerta[]
  try {
    configs = itens.map(normalizarConfig)
  } catch (e) {
    if (e instanceof ErroParametroAlerta) return res.status(400).json({ erro: e.message } satisfies ErroApi)
    throw e
  }

  transacao(() => {
    for (const config of configs) {
      if (repositorios.configAlerta.buscarPorId(config.tipo)) repositorios.configAlerta.atualizar(config.tipo, config)
      else repositorios.configAlerta.inserir(config)
    }
  })

  res.json({ ok: true, configuracoes: configuracoesAtuais() } satisfies SalvarAlertasResposta)
})

rotasAlertas.get('/alertas/logs', (_req, res) => {
  res.json({ logs: repositorios.notificacaoLog.recentes(HISTORICO_LIMITE) } satisfies LogsAlertaResposta)
})
