import { repositorios } from '../repositorios/index.js'
import { PARAMETROS_PADRAO, TIPOS_NOTIFICACAO } from '../notificacao/parametros.js'
import { CRITERIOS_PADRAO } from '../dominio/criteriosPadrao.js'

// Garante os dados mínimos (perfil, critérios, alertas e config) antes de atender a API.
export function garantirBootstraps() {
  if (!repositorios.perfilEmpresa.obter()) {
    repositorios.perfilEmpresa.inserir({
      id: 1,
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
      atualizado_em: new Date().toISOString(),
    })
  }

  if (repositorios.criterio.contar() === 0) {
    for (const criterio of CRITERIOS_PADRAO) repositorios.criterio.inserir(criterio)
  }

  for (const tipo of TIPOS_NOTIFICACAO) {
    const jaExiste = repositorios.configAlerta.listar().some((config) => config.tipo === tipo)
    if (!jaExiste) {
      repositorios.configAlerta.inserir({ tipo, ativo: true, destinatarios: [], parametros: PARAMETROS_PADRAO[tipo] })
    }
  }

  if (!repositorios.config.obter('chat_limite_diario')) {
    repositorios.config.definir('chat_limite_diario', '20')
  }
}
