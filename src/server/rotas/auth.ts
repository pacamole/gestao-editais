import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { db } from '../db/index.js'
import { gerarHashSenha, verificarSenha } from '../auth/senha.js'
import {
  DURACAO_SESSAO_SEGUNDOS,
  cookieDeSessao,
  cookieDeSessaoExpirado,
  tokenDaRequisicao,
  usuarioDaSessao,
} from '../auth/sessao.js'
import type { CadastroResposta, OkResposta, SessaoResposta } from '../../shared/tipos/auth.js'

export const rotasAuth = Router()

// Cadastro público: novos usuários recebem o papel ANALISTA.
rotasAuth.post('/cadastro', async (req, res) => {
  const nome = String(req.body?.nome ?? '').trim()
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const senha = String(req.body?.senha ?? '')

  // Validação dos dados.
  if (
    nome.length < 2 ||
    nome.length > 100 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    senha.length < 8 ||
    senha.length > 128
  ) {
    res.status(400).json({
      erro: 'Informe nome válido, e-mail válido e senha de 8 a 128 caracteres.'
    })
    return
  }

  // Verifica se o e-mail já foi cadastrado.
  if (
    db.prepare('SELECT id FROM usuario WHERE email = ?').get(email)
  ) {
    res.status(409).json({
      erro: 'Este e-mail já está cadastrado.'
    })
    return
  }

  // Cria um identificador e protege a senha.
  const id = randomUUID()
  const hash = await gerarHashSenha(senha)

  try {
    db.prepare(
      'INSERT INTO usuario (id, nome, email, senha_hash, papel, ativo, criado_em) VALUES (?, ?, ?, ?, ?, 1, ?)'
    ).run(
      id,
      nome,
      email,
      hash,
      'ANALISTA',
      new Date().toISOString()
    )

    res.status(201).json({
      ok: true,
      mensagem: 'Conta criada. Faça login para continuar.'
    } satisfies CadastroResposta)
  } catch {
    res.status(409).json({
      erro: 'Não foi possível cadastrar este e-mail.'
    })
  }
})

rotasAuth.post('/login', async (req, res) => {
  const email = String(req.body?.email || '').trim()
  const senha = String(req.body?.senha || '')

  const u = db.prepare(
    'SELECT id,senha_hash FROM usuario WHERE email=? AND ativo=1'
  ).get(email) as {
    id: string
    senha_hash: string
  } | undefined

  if (!u || !await verificarSenha(senha, u.senha_hash)) {
    res.status(401).json({
      erro: 'E-mail ou senha inválidos.'
    })
    return
  }

  const id = randomUUID()

  db.prepare(
    'INSERT INTO sessao(id,usuario_id,criada_em,expira_em) VALUES(?,?,?,?)'
  ).run(
    id,
    u.id,
    new Date().toISOString(),
    new Date(Date.now() + DURACAO_SESSAO_SEGUNDOS * 1000).toISOString()
  )

  res.setHeader('Set-Cookie', cookieDeSessao(id))

  res.json({ ok: true } satisfies OkResposta)
})

rotasAuth.get('/sessao', (req, res) => {
  const id = usuarioDaSessao(req)

  res.status(id ? 200 : 401).json({
    autenticado: !!id
  } satisfies SessaoResposta)
})

rotasAuth.post('/sair', (req, res) => {
  const token = tokenDaRequisicao(req)

  if (token) {
    db.prepare(
      'DELETE FROM sessao WHERE id=?'
    ).run(token)
  }

  res.setHeader('Set-Cookie', cookieDeSessaoExpirado())

  res.json({ ok: true } satisfies OkResposta)
})
