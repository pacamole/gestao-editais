import { Router } from 'express'
import { db, novoId } from '../db/index.js'
import { ColetaServico } from '../coleta/servico.js'
import { repositorios } from '../repositorios/index.js'
import type { FonteResposta, ListaFontesResposta } from '../../shared/tipos/fontes.js'

export const rotasFontes = Router()

rotasFontes.get('/fontes', (_req, res) => {
  const fontes = repositorios.fonte.listar().map((fonte) => {
    const ultimasExecucoes = db.prepare('SELECT * FROM coleta_execucao WHERE fonte_id = ? ORDER BY iniciada_em DESC LIMIT 10').all(fonte.id) as any[]
    return { ...fonte, execucoes: ultimasExecucoes }
  })
  res.json({ fontes } satisfies ListaFontesResposta)
})

rotasFontes.post('/fontes', (req, res) => {
  const dados = req.body ?? {}
  const payload = {
    id: dados.id ?? novoId(),
    nome: String(dados.nome ?? '').trim(),
    url_base: dados.url_base == null || dados.url_base === '' ? null : String(dados.url_base),
    tipo: String(dados.tipo ?? 'URL_MANUAL'),
    frequencia_cron: dados.frequencia_cron == null || dados.frequencia_cron === '' ? null : String(dados.frequencia_cron),
    ativo: dados.ativo !== false,
  }

  if (!payload.nome) return res.status(400).json({ erro: 'Nome da fonte é obrigatório.' })

  const existente = repositorios.fonte.buscarPorId(payload.id)
  const salvo = existente ? repositorios.fonte.atualizar(payload.id, payload) : repositorios.fonte.inserir(payload)
  res.json({ ok: true, fonte: salvo! } satisfies FonteResposta)
})

rotasFontes.patch('/fontes/:id/ativo', (req, res) => {
  const fonte = repositorios.fonte.buscarPorId(req.params.id)
  if (!fonte) return res.status(404).json({ erro: 'Fonte não encontrada.' })
  const atualizado = repositorios.fonte.atualizar(fonte.id, { ativo: !fonte.ativo })
  res.json({ ok: true, fonte: atualizado! } satisfies FonteResposta)
})

rotasFontes.post('/fontes/:id/coletar', async (req, res) => {
  const fonte = repositorios.fonte.buscarPorId(req.params.id)
  if (!fonte) return res.status(404).json({ erro: 'Fonte não encontrada.' })

  try {
    await new ColetaServico(repositorios).coletar(fonte)
    res.json({ ok: true, fonte: repositorios.fonte.buscarPorId(fonte.id)! } satisfies FonteResposta)
  } catch (erro: any) {
    res.status(400).json({ erro: erro.message ?? 'Falha ao disparar a coleta.' })
  }
})
