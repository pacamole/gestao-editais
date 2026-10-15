import { Router } from 'express'
import type { ErroApi } from '../../shared/api.js'
import type {
  ConfigSistemaResposta,
  TestarEmailResposta,
  TestarOllamaResposta,
} from '../../shared/tipos/configSistema.js'
import {
  configSmtp,
  ErroConfigSistema,
  lerConfigSistema,
  ollamaUrl,
  salvarConfigSistema,
  urlHttpValida,
} from '../config/sistema.js'
import { SmtpTransporte } from '../notificacao/transporte.js'

const TIMEOUT_TESTE_OLLAMA_MS = 5_000

export const rotasConfigSistema = Router()

const erro = (mensagem: string): ErroApi => ({ erro: mensagem })

rotasConfigSistema.get('/config/sistema', (_req, res) => {
  res.json({ config: lerConfigSistema() } satisfies ConfigSistemaResposta)
})

rotasConfigSistema.put('/config/sistema', (req, res) => {
  try {
    res.json({ config: salvarConfigSistema(req.body ?? {}) } satisfies ConfigSistemaResposta)
  } catch (e) {
    if (e instanceof ErroConfigSistema) return res.status(400).json(erro(e.message))
    throw e
  }
})

// Envia um e-mail de teste com o SMTP salvo (sem cair no terminal).
rotasConfigSistema.post('/config/sistema/testar-email', async (req, res) => {
  const para = String(req.body?.para ?? '').trim()
  if (!/^[^\s@]+@[^\s@]+$/.test(para)) return res.status(400).json(erro('Informe um e-mail de destino válido.'))

  let config
  try {
    config = configSmtp()
  } catch (e) {
    return res.status(400).json(erro((e as Error).message))
  }
  if (!config) return res.status(400).json(erro('SMTP não configurado: salve o servidor antes de testar.'))

  try {
    await new SmtpTransporte(config).enviar({
      para,
      assunto: 'Teste de e-mail — Editais I9+',
      texto: 'Se você recebeu esta mensagem, o SMTP do Gestor de Editais está funcionando.',
    })
    res.json({ ok: true } satisfies TestarEmailResposta)
  } catch (e) {
    res.status(502).json(erro(`Falha ao enviar: ${(e as Error).message}`))
  }
})

// Confere se o Ollama responde e se o modelo usado pelo sistema está instalado.
rotasConfigSistema.post('/config/sistema/testar-ollama', async (req, res) => {
  const informada = typeof req.body?.url === 'string' ? req.body.url.trim().replace(/\/+$/, '') : ''
  const url = informada || ollamaUrl()
  if (!urlHttpValida(url)) return res.status(400).json(erro('URL do Ollama inválida: use http:// ou https://.'))

  try {
    const resposta = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(TIMEOUT_TESTE_OLLAMA_MS) })
    if (!resposta.ok) return res.status(502).json(erro(`O Ollama respondeu HTTP ${resposta.status}.`))
    const dados = (await resposta.json()) as { models?: { name?: string }[] }
    const modelos = (dados.models ?? []).map((m) => m.name ?? '').filter(Boolean)
    const { ollama_modelo } = lerConfigSistema()
    res.json({ url, modelos, modelo_disponivel: modelos.includes(ollama_modelo) } satisfies TestarOllamaResposta)
  } catch {
    res.status(502).json(erro(`Não foi possível conectar ao Ollama em ${url}.`))
  }
})
