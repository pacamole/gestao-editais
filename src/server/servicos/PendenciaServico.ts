import { perfilProvisorio } from '../dominio/perfil.js'
import type { Repositorios } from '../repositorios/index.js'
import type { Pendencia, PendenciasResposta } from '../../shared/tipos/pendencias.js'

type RepositoriosPendencia = Pick<Repositorios, 'perfilEmpresa' | 'edital' | 'fonte' | 'destinatario'>

// O que falta configurar para o sistema funcionar, mostrado no topo de todas as páginas.
export class PendenciaServico {
  constructor(
    private readonly repos: RepositoriosPendencia,
    private readonly smtpConfigurado: () => boolean,
  ) {}

  listar(): PendenciasResposta {
    const pendencias: Pendencia[] = []

    const perfil = this.repos.perfilEmpresa.obter()
    if (!perfil || perfilProvisorio(perfil)) {
      const esperando = this.repos.edital.contarPorStatus('COLETADO')
      pendencias.push({
        id: 'PERFIL',
        texto: `Cadastre o perfil da empresa: sem ele os editais não são avaliados${esperando ? ` (${esperando} aguardando)` : ''}.`,
        link: '/configuracoes/perfil',
        acao: 'Cadastrar perfil',
      })
    }

    if (!this.smtpConfiguradoSemErro()) {
      pendencias.push({
        id: 'SMTP',
        texto: 'Os alertas por e-mail (prazos, editais novos) estão desligados: falta configurar o envio.',
        link: '/configuracoes/email',
        acao: 'Configurar e-mail',
      })
    } else if (!this.repos.destinatario.emails().length) {
      pendencias.push({
        id: 'DESTINATARIOS',
        texto: 'Ninguém recebe os alertas por e-mail: a lista de destinatários está vazia.',
        link: '/configuracoes/destinatarios',
        acao: 'Adicionar destinatário',
      })
    }

    return {
      pendencias,
      totalEditais: this.repos.edital.contar(),
      fontesMonitoradas: this.repos.fonte.listarMonitoradas().length,
    }
  }

  // SMTP com host mas sem usuário/senha lança erro; para o aviso, conta como não configurado.
  private smtpConfiguradoSemErro(): boolean {
    try {
      return this.smtpConfigurado()
    } catch {
      return false
    }
  }
}
