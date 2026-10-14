import { Router } from 'express'
import { repositorios } from '../repositorios/index.js'
import { TIPOS_NOTIFICACAO } from '../notificacao/parametros.js'
import type { AlertasResposta, ConfigAlertaResposta, LogsAlertaResposta } from '../../shared/tipos/alertas.js'

export const rotasAlertas = Router()

rotasAlertas.get('/alertas', (_req, res) => {
  const configuracoes = TIPOS_NOTIFICACAO.map((tipo) => repositorios.configAlerta.obter(tipo))
  const logs = repositorios.notificacaoLog.listar().slice(0, 20)
  res.json({ configuracoes, logs } satisfies AlertasResposta)
})

rotasAlertas.post('/alertas', (req, res) => {
  const { tipo, ativo, destinatarios, parametros } = req.body ?? {}
  if (!tipo || !TIPOS_NOTIFICACAO.includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo de notificação inválido.' })
  }

  const existente = repositorios.configAlerta.obter(tipo)
  const dados = {
    tipo,
    ativo: Boolean(ativo),
    destinatarios: Array.isArray(destinatarios) ? destinatarios.map((item: any) => String(item).trim()).filter(Boolean) : existente.destinatarios,
    parametros: { ...existente.parametros, ...(parametros ?? {}) },
  }

  const salvo = repositorios.configAlerta.buscarPorId(tipo)
    ? repositorios.configAlerta.atualizar(tipo, dados)
    : repositorios.configAlerta.inserir(dados)

  res.json({ ok: true, configuracao: salvo! } satisfies ConfigAlertaResposta)
})

rotasAlertas.get('/alertas/logs', (_req, res) => {
  res.json({ logs: repositorios.notificacaoLog.listar().slice(0, 30) } satisfies LogsAlertaResposta)
})
