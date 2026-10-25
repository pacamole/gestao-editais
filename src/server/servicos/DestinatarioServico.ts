import { emailValido, TIPOS_NOTIFICACAO } from '../../shared/catalogoAlertas.js'
import type { ListaDestinatariosResposta, RemoverDestinatarioResposta } from '../../shared/tipos/destinatarios.js'
import { transacao } from '../db/index.js'
import type { TipoNotificacao } from '../dominio/entidades.js'
import { ErroConflito, ErroNaoEncontrado, ErroValidacao } from '../dominio/erros.js'
import type { Repositorios } from '../repositorios/index.js'

type RepositoriosDestinatario = Pick<Repositorios, 'destinatario' | 'configAlerta' | 'usuario'>

// Lista de e-mails que recebem alertas.
export class DestinatarioServico {
  constructor(private readonly repos: RepositoriosDestinatario) {}

  listar(): ListaDestinatariosResposta {
    const alertas = TIPOS_NOTIFICACAO.map((tipo) => this.repos.configAlerta.obter(tipo))
    return {
      destinatarios: this.repos.destinatario.emails().map((email) => ({
        email,
        usuario: Boolean(this.repos.usuario.buscarPorEmail(email)),
        // Alerta sem escolha recebe a lista toda.
        alertas: alertas
          .filter((a) => !a.destinatarios.length || a.destinatarios.some((e) => e.toLowerCase() === email.toLowerCase()))
          .map((a) => a.tipo),
      })),
    }
  }

  adicionar(email: unknown): ListaDestinatariosResposta {
    const texto = String(email ?? '').trim()
    if (!emailValido(texto)) throw new ErroValidacao('E-mail inválido.')
    if (!this.repos.destinatario.adicionar(texto)) throw new ErroConflito('Este e-mail já está na lista.')
    return this.listar()
  }

  /**
   * Remove da lista e dos alertas que o tinham escolhido.
   * Alerta que ficaria sem ninguém é desativado: lista vazia significaria "todos da lista".
   */
  remover(email: string): RemoverDestinatarioResposta {
    const alvo = email.toLowerCase()
    const desativados: TipoNotificacao[] = []
    const removido = transacao(() => {
      if (!this.repos.destinatario.excluir(alvo)) return false
      for (const tipo of TIPOS_NOTIFICACAO) {
        const config = this.repos.configAlerta.obter(tipo)
        const restantes = config.destinatarios.filter((e) => e.toLowerCase() !== alvo)
        if (restantes.length === config.destinatarios.length) continue
        if (restantes.length) {
          this.repos.configAlerta.atualizar(tipo, { destinatarios: restantes })
        } else {
          this.repos.configAlerta.atualizar(tipo, { destinatarios: [], ativo: false })
          desativados.push(tipo)
        }
      }
      return true
    })
    if (!removido) throw new ErroNaoEncontrado('E-mail não está na lista.')
    return { ...this.listar(), alertas_desativados: desativados }
  }
}
