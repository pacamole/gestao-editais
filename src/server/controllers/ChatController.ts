import { Router, type Response } from 'express'
import { obterUsuarioId } from './sessaoHttp.js'
import { chatServico } from '../composicao.js'
import type { EventoChat, LimparChatResposta } from '../../shared/tipos/chat.js'

export const rotasChat = Router()

// Uma linha NDJSON por evento do stream.
function enviarEvento(res: Response, evento: EventoChat) {
  res.write(`${JSON.stringify(evento)}\n`)
}

rotasChat.get('/editais/:id/chat', (req, res) => {
  res.json(chatServico.historico(req.params.id, obterUsuarioId(req)))
})

rotasChat.post('/editais/:id/chat', async (req, res) => {
  const controlador = new AbortController()
  res.on('close', () => {
    if (!res.writableEnded) controlador.abort()
  })

  await chatServico.perguntar(
    { editalId: req.params.id, usuarioId: obterUsuarioId(req), pergunta: req.body?.pergunta },
    {
      sinal: controlador.signal,
      aoIniciar: () => {
        res.status(200)
        res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache, no-transform')
        res.setHeader('X-Accel-Buffering', 'no')
        res.flushHeaders()
      },
      aoEvento: (evento) => enviarEvento(res, evento),
    },
  )
  if (!res.writableEnded) res.end()
})

rotasChat.delete('/editais/:id/chat', (req, res) => {
  chatServico.limpar(req.params.id, obterUsuarioId(req))
  res.json({ ok: true } satisfies LimparChatResposta)
})
