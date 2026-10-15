import { Router } from 'express'
import { novoId } from '../db/index.js'
import { repositorios } from '../repositorios/index.js'
import { simularAvaliacao } from '../servicos/avaliacao.js'
import { validarCriterio } from '../../shared/catalogoCriterios.js'
import type { Operador, TipoCriterio } from '../dominio/entidades.js'
import type { CriterioResposta, ExcluirCriterioResposta, ListaCriteriosResposta, OkCriterioResposta, SimulacaoResposta } from '../../shared/tipos/criterios.js'

export const rotasCriterios = Router()

rotasCriterios.get('/criterios', (_req, res) => {
  const eliminatorios = repositorios.criterio.listarPorTipo('ELIMINATORIO')
  const pontuaveis = repositorios.criterio.listarPorTipo('PONTUAVEL')
  res.json({ eliminatorios, pontuaveis } satisfies ListaCriteriosResposta)
})

rotasCriterios.post('/criterios', (req, res) => {
  const item = req.body ?? {}
  const tipo: TipoCriterio = item.tipo === 'PONTUAVEL' ? 'PONTUAVEL' : 'ELIMINATORIO'
  const dados = {
    id: item.id ?? novoId(),
    nome: String(item.nome ?? '').trim(),
    tipo,
    campo_edital: String(item.campo_edital ?? '').trim(),
    campo_perfil: item.campo_perfil ? String(item.campo_perfil).trim() : null,
    operador: String(item.operador ?? '') as Operador,
    valor_referencia: item.valor_referencia == null || item.valor_referencia === '' ? null : String(item.valor_referencia).trim(),
    peso: tipo === 'PONTUAVEL' && item.peso != null && item.peso !== '' ? Number(item.peso) : null,
    mensagem_reprovacao: item.mensagem_reprovacao == null || item.mensagem_reprovacao === '' ? null : String(item.mensagem_reprovacao),
    ativo: item.ativo !== false,
    ordem: Number(item.ordem ?? 0),
  }

  const erro = validarCriterio(dados)
  if (erro) return res.status(400).json({ erro })

  const existente = repositorios.criterio.buscarPorId(dados.id)
  const salvo = existente ? repositorios.criterio.atualizar(dados.id, dados) : repositorios.criterio.inserir(dados)
  res.json({ ok: true, criterio: salvo! } satisfies CriterioResposta)
})

rotasCriterios.delete('/criterios/:id', (req, res) => {
  const removido = repositorios.criterio.excluir(req.params.id)
  res.json({ ok: true, removido } satisfies ExcluirCriterioResposta)
})

rotasCriterios.patch('/criterios/:id/ativo', (req, res) => {
  const criterio = repositorios.criterio.buscarPorId(req.params.id)
  if (!criterio) return res.status(404).json({ erro: 'Critério não encontrado.' })
  const atualizado = repositorios.criterio.atualizar(criterio.id, { ativo: !criterio.ativo })
  res.json({ ok: true, criterio: atualizado! } satisfies CriterioResposta)
})

rotasCriterios.post('/criterios/reordenar', (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((id: unknown) => typeof id === 'string') : []
  if (!ids.length) return res.status(400).json({ erro: 'Nenhum critério para reordenar.' })
  repositorios.criterio.reordenar(ids)
  res.json({ ok: true } satisfies OkCriterioResposta)
})

rotasCriterios.post('/criterios/simular', (req, res) => {
  const { edital_id } = req.body ?? {}
  if (!edital_id) return res.status(400).json({ erro: 'Selecione um edital para simular.' })
  try {
    const simulacao = simularAvaliacao(String(edital_id))
    res.json({ ok: true, simulacao } satisfies SimulacaoResposta)
  } catch (erro: any) {
    res.status(400).json({ erro: erro.message ?? 'Não foi possível simular.' })
  }
})
