// Cookie de sessão: a parte HTTP do login (ler e escrever o cookie). Quem decide se a sessão vale é o AuthServico.
import { authServico } from '../composicao.js'
import { DURACAO_SESSAO_SEGUNDOS } from '../servicos/AuthServico.js'

type ComCookie = { headers: { cookie?: string } }

export const COOKIE_SESSAO = 'sessao'

// Token de sessão enviado pelo navegador no cookie, se houver.
export function tokenDaRequisicao(req: ComCookie): string | undefined {
  const prefixo = `${COOKIE_SESSAO}=`
  return req.headers.cookie
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith(prefixo))
    ?.slice(prefixo.length)
}

/** Id do usuário da requisição (sessão válida, ou o primeiro usuário ativo). */
export function obterUsuarioId(req: ComCookie): string {
  return authServico.usuarioIdOuPadrao(tokenDaRequisicao(req))
}

export function cookieDeSessao(token: string): string {
  return `${COOKIE_SESSAO}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${DURACAO_SESSAO_SEGUNDOS}`
}

export function cookieDeSessaoExpirado(): string {
  return `${COOKIE_SESSAO}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
}
