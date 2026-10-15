import { Router, type Response } from 'express'
import { randomUUID } from 'node:crypto'
import { db } from '../db/index.js'
import { gerarHashSenha, verificarSenha } from '../auth/senha.js'
import { repositorios } from '../repositorios/index.js'
import {
  DURACAO_SESSAO_SEGUNDOS,
  cookieDeSessao,
  cookieDeSessaoExpirado,
  tokenDaRequisicao,
  usuarioDaSessao,
} from '../auth/sessao.js'
import type { CadastroResposta, OkResposta, SessaoResposta } from '../../shared/tipos/auth.js'

export const rotasAuth = Router()

type DadosCadastro = { nome: string; email: string; senha: string }

// Dados de cadastro normalizados, ou null se inválidos.
function lerCadastro(corpo: unknown): DadosCadastro | null {
  const dados = (corpo ?? {}) as Record<string, unknown>
  const nome = String(dados.nome ?? '').trim()
  const email = String(dados.email ?? '').trim().toLowerCase()
  const senha = String(dados.senha ?? '')
  const valido =
    nome.length >= 2 &&
    nome.length <= 100 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    email.length <= 254 &&
    senha.length >= 8 &&
    senha.length <= 128
  return valido ? { nome, email, senha } : null
}

const ERRO_CADASTRO_INVALIDO = 'Informe nome válido, e-mail válido e senha de 8 a 128 caracteres.'

// Cria a sessão do usuário e envia o cookie.
function abrirSessao(res: Response, usuarioId: string) {
  const id = randomUUID()
  db.prepare(
    'INSERT INTO sessao(id,usuario_id,criada_em,expira_em) VALUES(?,?,?,?)'
  ).run(
    id,
    usuarioId,
    new Date().toISOString(),
    new Date(Date.now() + DURACAO_SESSAO_SEGUNDOS * 1000).toISOString()
  )
  res.setHeader('Set-Cookie', cookieDeSessao(id))
}

// Cadastro público. Todo usuário tem acesso total.
rotasAuth.post('/cadastro', async (req, res) => {
  const dados = lerCadastro(req.body)
  if (!dados) {
    res.status(400).json({ erro: ERRO_CADASTRO_INVALIDO })
    return
  }
  const { nome, email, senha } = dados

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
      'GESTOR', // coluna legada `papel`: gravada só porque é NOT NULL
      new Date().toISOString()
    )
    // Toda conta nova passa a receber alertas; dá para tirar na lista de destinatários.
    repositorios.destinatario.adicionar(email)

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

  abrirSessao(res, u.id)

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
