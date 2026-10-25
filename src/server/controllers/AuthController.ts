import { Router } from 'express'
import { authServico } from '../composicao.js'
import { cookieDeSessao, cookieDeSessaoExpirado, tokenDaRequisicao } from './sessaoHttp.js'
import type { CadastroResposta, OkResposta, SessaoResposta } from '../../shared/tipos/auth.js'

export const rotasAuth = Router()

// Cadastro público.
rotasAuth.post('/cadastro', async (req, res) => {
  await authServico.cadastrar(req.body)
  res.status(201).json({ ok: true, mensagem: 'Conta criada. Faça login para continuar.' } satisfies CadastroResposta)
})

rotasAuth.post('/login', async (req, res) => {
  const token = await authServico.entrar(req.body?.email, req.body?.senha)
  res.setHeader('Set-Cookie', cookieDeSessao(token))
  res.json({ ok: true } satisfies OkResposta)
})

// Diz se há sessão e, havendo, quem está logado (mostrado na barra lateral).
rotasAuth.get('/sessao', (req, res) => {
  const usuario = authServico.usuarioLogado(tokenDaRequisicao(req))
  res.json({ autenticado: true, usuario } satisfies SessaoResposta)
})

rotasAuth.post('/sair', (req, res) => {
  authServico.sair(tokenDaRequisicao(req))
  res.setHeader('Set-Cookie', cookieDeSessaoExpirado())
  res.json({ ok: true } satisfies OkResposta)
})
