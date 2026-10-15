import { Router, type Response } from 'express'
import { novoId, transacao } from '../db/index.js'
import { obterUsuarioId } from '../auth/sessao.js'
import { repositorios } from '../repositorios/index.js'
import { chatLimiteDiario, conexaoOllama } from '../config/sistema.js'
import { ErroOllama, transmitirRespostaSobreEdital } from '../chat/ollama.js'
import type { ErroChatDados, EventoChat, HistoricoChatResposta, LimparChatResposta } from '../../shared/tipos/chat.js'

export const rotasChat = Router()

// Uma linha NDJSON por evento do stream.
function enviarEvento(res: Response, evento: EventoChat) {
  res.write(`${JSON.stringify(evento)}\n`)
}

let filaPerguntas = Promise.resolve()

function executarPerguntaSerialmente<T>(operacao: () => Promise<T>): Promise<T> {
  const anterior = filaPerguntas
  let liberar!: () => void
  filaPerguntas = new Promise<void>((resolve) => {
    liberar = resolve
  })
  return anterior.then(operacao).finally(liberar)
}

// ---- Chat sobre o edital ----
rotasChat.get('/editais/:id/chat', (req, res) => {
  const edital = repositorios.edital.buscarPorId(req.params.id)
  if (!edital) return res.status(404).json({ erro: 'Edital não encontrado.' })

  const usuarioId = obterUsuarioId(req)
  const conversa = repositorios.conversa.buscarDoUsuario(edital.id, usuarioId)
  const limite = chatLimiteDiario()
  const inicioDoDia = new Date()
  inicioDoDia.setHours(0, 0, 0, 0)
  const feitasHoje = repositorios.mensagem.contarPerguntasDoUsuarioDesde(usuarioId, inicioDoDia.toISOString())

  res.json({
    mensagens: conversa ? repositorios.mensagem.listarDaConversa(conversa.id) : [],
    limite,
    restantes: Math.max(0, limite - feitasHoje),
  } satisfies HistoricoChatResposta)
})

rotasChat.post('/editais/:id/chat', async (req, res) => {
  const edital = repositorios.edital.buscarPorId(req.params.id)
  if (!edital) return res.status(404).json({ erro: 'Edital não encontrado.' })

  const pergunta = req.body?.pergunta
  const textoEdital = edital.texto_extraido
  if (typeof pergunta !== 'string' || !pergunta.trim()) {
    return res.status(400).json({ erro: 'Digite uma pergunta sobre o edital.' })
  }
  if (pergunta.trim().length > 2000) {
    return res.status(400).json({ erro: 'A pergunta deve ter no máximo 2.000 caracteres.' })
  }
  if (!textoEdital?.trim()) {
    return res.status(409).json({ erro: 'Este edital ainda não tem texto extraído para consultar.' })
  }

  return executarPerguntaSerialmente(async () => {
    const usuarioId = obterUsuarioId(req)
    const limite = chatLimiteDiario()
    const inicioDoDia = new Date()
    inicioDoDia.setHours(0, 0, 0, 0)
    const feitasHoje = repositorios.mensagem.contarPerguntasDoUsuarioDesde(usuarioId, inicioDoDia.toISOString())

    if (feitasHoje >= limite) {
      return res.status(429).json({
        erro: 'Você atingiu o limite diário de perguntas do chat.',
        limite,
        restantes: 0,
      } satisfies ErroChatDados)
    }

    const conversaExistente = repositorios.conversa.buscarDoUsuario(edital.id, usuarioId)
    const historico = conversaExistente
      ? repositorios.mensagem.ultimasDaConversa(conversaExistente.id, 6)
      : []
    res.status(200)
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()
    enviarEvento(res, {
      tipo: 'status',
      mensagem: 'Enviando o edital completo ao Ollama. A resposta pode demorar um pouco mais…',
    })

    const controlador = new AbortController()
    res.on('close', () => {
      if (!res.writableEnded) controlador.abort()
    })

    let conteudo = ''
    try {
      for await (const trecho of transmitirRespostaSobreEdital(
        textoEdital,
        pergunta.trim(),
        historico.map(({ papel, conteudo: texto }) => ({ papel, conteudo: texto })),
        fetch,
        controlador.signal,
        repositorios.perfilEmpresa.obter() ?? null,
        conexaoOllama(),
      )) {
        conteudo += trecho
        enviarEvento(res, { tipo: 'trecho', conteudo: trecho })
      }
    } catch (erro) {
      if (res.destroyed) return
      console.error('Falha ao gerar resposta do chat com Ollama:', erro)
      const mensagem = erro instanceof ErroOllama
        ? erro.message
        : 'Não foi possível obter uma resposta do assistente.'
      enviarEvento(res, { tipo: 'erro', mensagem })
      return res.end()
    }

    const agoraIso = new Date().toISOString()
    const conversa = transacao(() => {
      const conversa = conversaExistente ?? repositorios.conversa.inserir({
        id: novoId(),
        edital_id: edital.id,
        usuario_id: usuarioId,
      })
      repositorios.mensagem.inserir({
        id: novoId(),
        conversa_id: conversa.id,
        papel: 'USUARIO',
        conteudo: pergunta.trim(),
      })
      repositorios.mensagem.inserir({
        id: novoId(),
        conversa_id: conversa.id,
        papel: 'ASSISTENTE',
        conteudo,
      })
      repositorios.conversa.atualizar(conversa.id, { atualizada_em: agoraIso })
      return conversa
    })

    const feitasDepois = feitasHoje + 1
    enviarEvento(res, {
      tipo: 'concluido',
      mensagens: repositorios.mensagem.listarDaConversa(conversa.id),
      limite,
      restantes: Math.max(0, limite - feitasDepois),
    })
    return res.end()
  })
})

rotasChat.delete('/editais/:id/chat', (req, res) => {
  const edital = repositorios.edital.buscarPorId(req.params.id)
  if (!edital) return res.status(404).json({ erro: 'Edital não encontrado.' })

  const usuarioId = obterUsuarioId(req)
  const conversa = repositorios.conversa.buscarDoUsuario(edital.id, usuarioId)
  if (conversa) repositorios.mensagem.excluirDaConversa(conversa.id)
  res.json({ ok: true } satisfies LimparChatResposta)
})
