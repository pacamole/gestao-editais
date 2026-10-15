import { Router } from 'express'
import type { ErroApi } from '../../shared/api.js'
import { ErroParametroAlerta, normalizarDestinatarios } from '../../shared/catalogoAlertas.js'
import type {
  AlertasResposta,
  LogsAlertaResposta,
  SalvarAlertasResposta,
  SimularAlertaResposta,
} from '../../shared/tipos/alertas.js'
import { configSmtp } from '../config/sistema.js'
import { transacao } from '../db/index.js'
import type { ConfigAlerta, TipoNotificacao } from '../dominio/entidades.js'
import { notificacaoServico } from '../notificacao/index.js'
import { normalizarParametros, TIPOS_NOTIFICACAO } from '../notificacao/parametros.js'
import { notificacaoSimulada } from '../notificacao/simulacao.js'
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

// E-mails válidos e todos presentes na lista de destinatários.
function destinatariosDaLista(entrada: unknown): string[] {
  const emails = normalizarDestinatarios(entrada ?? [])
  const lista = new Set(repositorios.destinatario.emails().map((e) => e.toLowerCase()))
  const fora = emails.find((e) => !lista.has(e.toLowerCase()))
  if (fora) throw new ErroParametroAlerta(`${fora} não está na lista de destinatários.`)
  return emails
}

// Valida um item e devolve a configuração pronta para gravar.
function normalizarConfig(item: unknown): ConfigAlerta {
  const { tipo, ativo, destinatarios, parametros } = (item ?? {}) as Record<string, unknown>
  if (!TIPOS_NOTIFICACAO.includes(tipo as TipoNotificacao)) throw new ErroParametroAlerta('Tipo de notificação inválido.')
  const t = tipo as TipoNotificacao
  try {
    return {
      tipo: t,
      ativo: Boolean(ativo),
      destinatarios: destinatariosDaLista(destinatarios),
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

// Envia agora um e-mail do tipo com dados fictícios, para os destinatários da tela (mesmo não salvos).
rotasAlertas.post('/alertas/:tipo/simular', async (req, res) => {
  const tipo = req.params.tipo as TipoNotificacao
  if (!TIPOS_NOTIFICACAO.includes(tipo)) return res.status(404).json({ erro: 'Tipo de notificação inválido.' } satisfies ErroApi)

  let emails: string[]
  let smtpAtivo: boolean
  try {
    emails = notificacaoServico.destinatarios(destinatariosDaLista(req.body?.destinatarios)).map((d) => d.email)
    smtpAtivo = configSmtp() !== null
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : 'Configuração inválida.'
    return res.status(400).json({ erro: mensagem } satisfies ErroApi)
  }
  if (!emails.length) return res.status(400).json({ erro: 'A lista de destinatários está vazia.' } satisfies ErroApi)

  const { enviados, falhas } = await notificacaoServico.simular(notificacaoSimulada(tipo), emails)
  res.json({ enviados, falhas, smtp_ativo: smtpAtivo } satisfies SimularAlertaResposta)
})

rotasAlertas.get('/alertas/logs', (_req, res) => {
  res.json({ logs: repositorios.notificacaoLog.recentes(HISTORICO_LIMITE) } satisfies LogsAlertaResposta)
})
