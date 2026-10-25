import { Router, type Request } from 'express'
import { obterUsuarioId } from './sessaoHttp.js'
import { editalServico, revisaoServico } from '../composicao.js'
import type { ConsultaEditais } from '../servicos/EditalServico.js'

export const rotasEditais = Router()

const texto = (valor: unknown): string | undefined => (typeof valor === 'string' ? valor : undefined)
const marcado = (valor: unknown): boolean => valor === '1' || valor === 'true'

// Parâmetros da URL da lista (a tela e a exportação CSV usam os mesmos).
function lerConsulta(req: Request): ConsultaEditais {
  const q = req.query
  return {
    busca: texto(q.busca),
    status: texto(q.status),
    elegibilidade: texto(q.elegibilidade),
    faixaFit: texto(q.faixaFit),
    modalidade: texto(q.modalidade),
    fonteId: texto(q.fonte_id),
    prazoDe: texto(q.prazoDe),
    prazoAte: texto(q.prazoAte),
    somentePrazoAberto: marcado(q.somentePrazoAberto),
    novosSemana: marcado(q.novosSemana),
    prazoUrgente: marcado(q.prazoUrgente),
    pagina: Number(q.pagina ?? 1),
    limite: Number(q.limite ?? 10),
  }
}

// ---- Lista de editais (P03) ----
rotasEditais.get('/editais', (req, res) => {
  if (req.query.formato === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="editais-filtrados.csv"')
    return res.send(editalServico.exportarCsv(lerConsulta(req)))
  }
  res.json(editalServico.listar(lerConsulta(req)))
})

// ---- Ações em lote (aprovar / descartar) ----
rotasEditais.post('/editais/lote', (req, res) => {
  const { ids, acao, comentario } = req.body ?? {}
  res.json(revisaoServico.revisarLote(ids, acao, comentario, obterUsuarioId(req)))
})

// ---- Detalhe do edital (P04) ----
rotasEditais.get('/editais/:id', (req, res) => {
  res.json(editalServico.detalhe(req.params.id))
})

rotasEditais.patch('/editais/:id/campos', (req, res) => {
  res.json(editalServico.editarCampos(req.params.id, req.body?.campos))
})

// ---- Ação de revisão individual ----
rotasEditais.post('/editais/:id/revisao', (req, res) => {
  const { acao, comentario } = req.body ?? {}
  res.json(revisaoServico.revisar(req.params.id, acao, comentario, obterUsuarioId(req)))
})
