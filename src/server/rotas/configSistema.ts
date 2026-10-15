import { Router } from 'express'
import type { ErroApi } from '../../shared/api.js'
import type {
  ConfigSistemaResposta,
  SituacaoOllama,
  TestarEmailResposta,
  TestarOllamaResposta,
} from '../../shared/tipos/configSistema.js'
import { cabecalhosOllama, enderecoOllama } from '../chat/ollama.js'
import {
  configSmtp,
  conexaoOllamaParaTeste,
  ErroConfigSistema,
  lerConfigSistema,
  salvarConfigSistema,
  urlHttpValida,
} from '../config/sistema.js'
import { SmtpTransporte } from '../notificacao/transporte.js'

const TIMEOUT_TESTE_OLLAMA_MS = 5_000
const TIMEOUT_TESTE_NUVEM_MS = 20_000

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

// Confere se o Ollama responde, se aceita a chave e se o modelo está disponível.
// Responde 200 com a situação; 400 só para endereço inválido.
rotasConfigSistema.post('/config/sistema/testar-ollama', async (req, res) => {
  const { modo, conexao } = conexaoOllamaParaTeste(req.body ?? {})
  if (!urlHttpValida(conexao.url)) return res.status(400).json(erro('Endereço do Ollama inválido: use http:// ou https://.'))

  const responder = (situacao: SituacaoOllama, modelos: string[] = []) =>
    res.json({ situacao, modo, url: conexao.url, modelo: conexao.modelo, modelos } satisfies TestarOllamaResposta)

  if (modo === 'NUVEM' && !conexao.chave) return responder('SEM_CHAVE')

  const chamar = (caminho: string, init: RequestInit = {}) =>
    fetch(enderecoOllama(conexao, caminho), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...cabecalhosOllama(conexao) },
      signal: AbortSignal.timeout(modo === 'NUVEM' ? TIMEOUT_TESTE_NUVEM_MS : TIMEOUT_TESTE_OLLAMA_MS),
    })

  let tags: Response
  try {
    tags = await chamar('/api/tags')
  } catch {
    return responder('SEM_CONEXAO')
  }
  if (tags.status === 401 || tags.status === 403) return responder('ACESSO_NEGADO')
  if (!tags.ok) return responder('SEM_CONEXAO')

  const dados = (await tags.json().catch(() => ({}))) as { models?: { name?: string }[] }
  const modelos = (dados.models ?? []).map((m) => m.name ?? '').filter(Boolean)
  if (!conexao.modelo || !modelos.includes(conexao.modelo)) return responder('SEM_MODELO', modelos)
  if (modo === 'LOCAL') return responder('OK', modelos)

  // No Ollama Cloud a lista de modelos é pública: só uma chamada de verdade (1 token) prova que a chave vale.
  try {
    const chat = await chamar('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        model: conexao.modelo,
        stream: false,
        messages: [{ role: 'user', content: 'Responda apenas: ok' }],
        options: { num_predict: 1 },
      }),
    })
    if (chat.status === 401 || chat.status === 403) return responder('ACESSO_NEGADO', modelos)
    responder(chat.ok ? 'OK' : 'SEM_CONEXAO', modelos)
  } catch {
    responder('SEM_CONEXAO', modelos)
  }
})
