import { Router } from 'express'
import type { AcaoRevisao, StatusEdital } from '../entidades.js'
import { repositorios } from '../repositorios/index.js'
import { usuarioDaRequisicao } from './auth.js'

export const rotasEditais = Router()

function usuario(req: Parameters<typeof usuarioDaRequisicao>[0], res: any) {
  const u = usuarioDaRequisicao(req)
  if (!u) res.status(401).json({ erro: 'Faça login para continuar.' })
  return u
}

rotasEditais.get('/:id', (req, res) => {
  if (!usuario(req, res)) return
  const edital = repositorios.edital.buscarPorId(req.params.id)
  if (!edital) return res.status(404).json({ erro: 'Edital não encontrado.' })
  res.json({
    edital,
    avaliacao: repositorios.avaliacao.ultimaDoEdital(edital.id) ?? null,
    evidencias: repositorios.evidencia.listarDoEdital(edital.id),
    revisoes: repositorios.revisao.listarDoEdital(edital.id),
  })
})

rotasEditais.post('/:id/revisao', (req, res) => {
  const u = usuario(req, res); if (!u) return
  const edital = repositorios.edital.buscarPorId(req.params.id)
  if (!edital) return res.status(404).json({ erro: 'Edital não encontrado.' })
  const acao = String(req.body?.acao ?? '') as AcaoRevisao
  const permitidas: AcaoRevisao[] = ['APROVOU', 'DESCARTOU', 'MARCOU_INSCRITO', 'REGISTROU_RESULTADO', 'AJUSTOU_NOTA']
  if (!permitidas.includes(acao)) return res.status(400).json({ erro: 'Ação inválida.' })
  const comentario = String(req.body?.comentario ?? '').trim() || null
  if (acao === 'DESCARTOU' && !comentario) return res.status(400).json({ erro: 'Informe um comentário para descartar.' })
  const status: Partial<Record<AcaoRevisao, StatusEdital>> = { APROVOU: 'APROVADO', DESCARTOU: 'DESCARTADO', MARCOU_INSCRITO: 'INSCRITO', REGISTROU_RESULTADO: 'ENCERRADO' }
  if (status[acao]) repositorios.edital.atualizar(edital.id, { status: status[acao]! })
  const revisao = repositorios.revisao.inserir({ edital_id: edital.id, usuario_id: u.id, acao, comentario, valor_anterior: edital.status, valor_novo: status[acao] ?? null })
  res.json({ revisao, edital: repositorios.edital.buscarPorId(edital.id) })
})

rotasEditais.get('/:id/chat', (req, res) => {
  const u = usuario(req, res); if (!u) return
  let conversa = repositorios.conversa.buscarDoUsuario(req.params.id, u.id)
  const mensagens = conversa ? repositorios.mensagem.listarDaConversa(conversa.id) : []
  res.json({ conversa: conversa ?? null, mensagens, restantes: Math.max(0, 20 - mensagens.filter((m) => m.papel === 'USUARIO').length) })
})

rotasEditais.post('/:id/chat', (req, res) => {
  const u = usuario(req, res); if (!u) return
  const edital = repositorios.edital.buscarPorId(req.params.id)
  if (!edital) return res.status(404).json({ erro: 'Edital não encontrado.' })
  const pergunta = String(req.body?.pergunta ?? '').trim()
  if (!pergunta) return res.status(400).json({ erro: 'Digite uma pergunta.' })
  let conversa = repositorios.conversa.buscarDoUsuario(edital.id, u.id)
  if (!conversa) conversa = repositorios.conversa.inserir({ edital_id: edital.id, usuario_id: u.id })
  repositorios.mensagem.inserir({ conversa_id: conversa.id, papel: 'USUARIO', conteudo: pergunta })
  // MVP local: resposta baseada somente nos dados já extraídos. Mantém o fluxo pronto para futura integração com LLM.
  const p = pergunta.toLowerCase()
  let resposta = edital.resumo_executivo || 'O edital ainda não possui resumo executivo extraído.'
  if (p.includes('prazo')) resposta = edital.prazo_inscricao ? `O prazo de inscrição registrado é ${edital.prazo_inscricao}.` : 'O prazo não foi localizado no documento.'
  else if (p.includes('valor')) resposta = edital.valor_maximo_por_projeto != null ? `O valor máximo por projeto registrado é R$ ${edital.valor_maximo_por_projeto.toLocaleString('pt-BR')}.` : 'O valor máximo por projeto não foi localizado.'
  else if (p.includes('contrapartida')) resposta = edital.exige_contrapartida == null ? 'A exigência de contrapartida não foi localizada.' : edital.exige_contrapartida ? `O edital exige contrapartida${edital.percentual_contrapartida != null ? ` de ${edital.percentual_contrapartida}%` : ''}.` : 'O edital não exige contrapartida segundo os dados extraídos.'
  repositorios.mensagem.inserir({ conversa_id: conversa.id, papel: 'ASSISTENTE', conteudo: resposta })
  res.json({ mensagens: repositorios.mensagem.listarDaConversa(conversa.id) })
})

rotasEditais.delete('/:id/chat', (req, res) => {
  const u = usuario(req, res); if (!u) return
  const conversa = repositorios.conversa.buscarDoUsuario(req.params.id, u.id)
  if (conversa) repositorios.mensagem.excluirDaConversa(conversa.id)
  res.status(204).end()
})
