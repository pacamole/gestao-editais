import { PARAMETROS_PADRAO, TIPOS_NOTIFICACAO } from '../../shared/catalogoAlertas.js'
import { CRITERIOS_PADRAO } from '../dominio/criteriosPadrao.js'
import type { Repositorios } from '../repositorios/index.js'
import { CHAT_LIMITE_DIARIO_PADRAO, CHAVES_CONFIG } from './ConfigSistemaServico.js'

type RepositoriosBootstrap = Pick<
  Repositorios,
  'perfilEmpresa' | 'criterio' | 'configAlerta' | 'config' | 'destinatario' | 'usuario'
>

const DESTINATARIOS_INICIADOS = 'destinatarios_iniciados'

// Valores provisórios até a empresa preencher o perfil real (§14, perguntas 1 e 8-10).
const PERFIL_PADRAO = {
  razao_social: 'I9+ Consultoria e Inovação',
  nome_fantasia: 'I9+',
  cnpj: '00.000.000/0000-00',
  cnae_principal: '5821-1/00',
  cnaes_secundarios: ['6201-5/00', '7210-0/00'],
  porte: 'ME',
  natureza_juridica: 'Sociedade Empresária Limitada',
  data_fundacao: '2020-01-01',
  faturamento_anual: 4200000,
  uf: 'PR',
  municipio: 'Curitiba',
  areas_atuacao: ['ESG', 'Sustentabilidade', 'Inovação', 'Energia', 'Descarbonização'],
  palavras_chave: ['ESG', 'sustentabilidade', 'inovação', 'energia', 'descarbonização', 'clima'],
  possui_ict_parceira: false,
  certidoes_disponiveis: ['CND', 'FGTS', 'CRLV'],
  capacidade_contrapartida_percentual: 30,
  valor_minimo_interesse: 500000,
  prazo_minimo_preparo_dias: 30,
} as const

// Garante os dados mínimos (perfil, critérios, alertas e config) numa base nova ou antiga.
// Roda antes de atender a API e depois de `db:reset`; só cria o que falta, nunca sobrescreve.
export class BootstrapServico {
  constructor(private readonly repos: RepositoriosBootstrap) {}

  garantir(): void {
    if (!this.repos.perfilEmpresa.obter()) {
      this.repos.perfilEmpresa.inserir({
        id: 1,
        ...PERFIL_PADRAO,
        cnaes_secundarios: [...PERFIL_PADRAO.cnaes_secundarios],
        areas_atuacao: [...PERFIL_PADRAO.areas_atuacao],
        palavras_chave: [...PERFIL_PADRAO.palavras_chave],
        certidoes_disponiveis: [...PERFIL_PADRAO.certidoes_disponiveis],
        atualizado_em: new Date().toISOString(),
      })
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
