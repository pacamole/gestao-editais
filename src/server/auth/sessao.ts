import { db } from '../db/index.js'

export const COOKIE_SESSAO = 'sessao'
export const DURACAO_SESSAO_SEGUNDOS = 8 * 3600

// Token de sessão enviado pelo navegador no cookie, se houver.
export function tokenDaRequisicao(req: { headers: { cookie?: string } }): string | undefined {
  const prefixo = `${COOKIE_SESSAO}=`
  return req.headers.cookie
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith(prefixo))
    ?.slice(prefixo.length)
}

// Id do usuário dono de uma sessão válida (não expirada), ou null.
export function usuarioDaSessao(req: { headers: { cookie?: string } }): string | null {
  const token = tokenDaRequisicao(req)
  if (!token) return null

  const row = db
    .prepare('SELECT usuario_id FROM sessao WHERE id=? AND expira_em > ?')
    .get(token, new Date().toISOString()) as { usuario_id: string } | undefined

  return row?.usuario_id || null
}

// Usuário da requisição; sem sessão válida, cai no primeiro gestor (ou num id fixo).
export function obterUsuarioId(req: { headers: { cookie?: string } }): string {
  const logado = usuarioDaSessao(req)
  if (logado) return logado

  const gestor = db.prepare("SELECT id FROM usuario WHERE papel='GESTOR' LIMIT 1").get() as { id: string } | undefined
  return gestor?.id ?? '00000000-0000-0000-0000-000000000001'
}

export function cookieDeSessao(token: string): string {
  return `${COOKIE_SESSAO}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${DURACAO_SESSAO_SEGUNDOS}`
}

export function cookieDeSessaoExpirado(): string {
  return `${COOKIE_SESSAO}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
}
