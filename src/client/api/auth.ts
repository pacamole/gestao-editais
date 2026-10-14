import type {
  CadastroEntrada,
  CadastroResposta,
  LoginEntrada,
  OkResposta,
  SessaoResposta,
} from '../../shared/tipos/auth'
import { ErroApi, requisicao } from './cliente'

// Rotas de autenticação não redirecionam no 401: login inválido também responde 401.
export const auth = {
  cadastrar: (dados: CadastroEntrada) =>
    requisicao<CadastroResposta>('/api/auth/cadastro', { metodo: 'POST', corpo: dados, redirecionarSe401: false }),

  entrar: (dados: LoginEntrada) =>
    requisicao<OkResposta>('/api/auth/login', { metodo: 'POST', corpo: dados, redirecionarSe401: false }),

  sair: () => requisicao<OkResposta>('/api/auth/sair', { metodo: 'POST', redirecionarSe401: false }),

  // true/false conforme a sessão; outros erros (rede, 500) são propagados.
  async autenticado(): Promise<boolean> {
    try {
      const r = await requisicao<SessaoResposta>('/api/auth/sessao', { redirecionarSe401: false })
      return r.autenticado
    } catch (erro) {
      if (erro instanceof ErroApi && erro.status === 401) return false
      throw erro
    }
  },
}
