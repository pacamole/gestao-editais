import { Router } from 'express'
import { authServico } from '../composicao.js'
import { tokenDaRequisicao } from './sessaoHttp.js'
import { db, agora, novoId } from '../db/index.js'
import { ErroNaoAutenticado, ErroNaoEncontrado, ErroValidacao } from '../dominio/erros.js'

export const rotasComentarios = Router()

type Tipo = 'GERAL' | 'APROVACAO' | 'REPROVACAO'
const tipos: Tipo[] = ['GERAL', 'APROVACAO', 'REPROVACAO']

function usuarioAutenticado(req: { headers: { cookie?: string } }): string {
  const id = authServico.usuarioIdDaSessao(tokenDaRequisicao(req))
  if (!id) throw new ErroNaoAutenticado('Faça login para gerenciar comentários.')
  return id
}

function validarEdital(id: string): void {
  if (!db.prepare('SELECT id FROM edital WHERE id = ?').get(id)) throw new ErroNaoEncontrado('Edital não encontrado.')
}

// Lista pública para usuários logados; não expõe dados sensíveis do autor.
rotasComentarios.get('/editais/:id/comentarios', (req, res) => {
  usuarioAutenticado(req)
  validarEdital(req.params.id)
  res.json(db.prepare(`SELECT c.id, c.usuario_id, u.nome AS autor, u.email AS autor_email, c.tipo, c.texto, c.criado_em
    FROM comentario_edital c JOIN usuario u ON u.id = c.usuario_id
    WHERE c.edital_id = ? ORDER BY c.criado_em DESC`).all(req.params.id))
})

rotasComentarios.post('/editais/:id/comentarios', (req, res) => {
  const usuarioId = usuarioAutenticado(req)
  validarEdital(req.params.id)
  const tipo = req.body?.tipo as Tipo
  const texto = typeof req.body?.texto === 'string' ? req.body.texto.trim() : ''
  if (!tipos.includes(tipo) || !texto || texto.length > 3000) {
    throw new ErroValidacao('Selecione um tipo e escreva um comentário de até 3000 caracteres.')
  }
  const id = novoId()
  db.prepare('INSERT INTO comentario_edital (id, edital_id, usuario_id, tipo, texto, criado_em) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.params.id, usuarioId, tipo, texto, agora())
  res.status(201).json({ ok: true, id })
})

// A cláusula usuario_id = ? garante autorização no próprio comando DELETE.
rotasComentarios.delete('/editais/:id/comentarios/:comentarioId', (req, res) => {
  const usuarioId = usuarioAutenticado(req)
  validarEdital(req.params.id)
  const resultado = db.prepare('DELETE FROM comentario_edital WHERE id = ? AND edital_id = ? AND usuario_id = ?')
    .run(req.params.comentarioId, req.params.id, usuarioId)
  if (!resultado.changes) throw new ErroNaoEncontrado('Comentário inexistente ou não pertence a você.')
  res.json({ ok: true })
})
