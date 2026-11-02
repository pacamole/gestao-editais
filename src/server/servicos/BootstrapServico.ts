import { PARAMETROS_PADRAO, TIPOS_NOTIFICACAO } from '../../shared/catalogoAlertas.js'
import { CRITERIOS_PADRAO } from '../dominio/criteriosPadrao.js'
import { PERFIL_INICIAL } from '../dominio/perfilInicial.js'
import type { Repositorios } from '../repositorios/index.js'
import { CHAT_LIMITE_DIARIO_PADRAO, CHAVES_CONFIG } from './ConfigSistemaServico.js'

type RepositoriosBootstrap = Pick<
  Repositorios,
  'perfilEmpresa' | 'criterio' | 'configAlerta' | 'config' | 'destinatario' | 'usuario'
>

const DESTINATARIOS_INICIADOS = 'destinatarios_iniciados'

// Garante os dados mínimos (perfil da empresa, critérios, alertas e config) numa base nova ou antiga.
// Roda antes de atender a API e depois de `db:reset`; só cria o que falta, nunca sobrescreve.
export class BootstrapServico {
  constructor(private readonly repos: RepositoriosBootstrap) {}

  garantir(): void {
    if (!this.repos.perfilEmpresa.obter()) {
      this.repos.perfilEmpresa.inserir({ ...PERFIL_INICIAL, atualizado_em: new Date().toISOString() })
    }

    if (this.repos.criterio.contar() === 0) {
      for (const criterio of CRITERIOS_PADRAO) this.repos.criterio.inserir(criterio)
    }

    const existentes = new Set(this.repos.configAlerta.listar().map((config) => config.tipo))
    for (const tipo of TIPOS_NOTIFICACAO) {
      if (!existentes.has(tipo)) {
        this.repos.configAlerta.inserir({ tipo, ativo: true, destinatarios: [], parametros: PARAMETROS_PADRAO[tipo] })
      }
    }

    if (!this.repos.config.obter(CHAVES_CONFIG.chatLimiteDiario)) {
      this.repos.config.definir(CHAVES_CONFIG.chatLimiteDiario, String(CHAT_LIMITE_DIARIO_PADRAO))
    }

    // Uma vez só: a lista de destinatários começa com os usuários existentes.
    // Depois disso ela é do usuário; um e-mail removido não volta.
    if (!this.repos.config.obter(DESTINATARIOS_INICIADOS)) {
      for (const { email } of this.repos.usuario.listarAtivos()) this.repos.destinatario.adicionar(email)
      this.repos.config.definir(DESTINATARIOS_INICIADOS, '1')
    }
  }
}
