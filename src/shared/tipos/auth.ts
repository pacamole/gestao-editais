// Contratos da API de autenticação (/api/auth).

export type CadastroEntrada = { nome: string; email: string; senha: string }
export type LoginEntrada = { email: string; senha: string }

export type CadastroResposta = { ok: true; mensagem: string }
export type OkResposta = { ok: true }
export type UsuarioLogado = { nome: string; email: string }
export type SessaoResposta = { autenticado: boolean; usuario?: UsuarioLogado }
