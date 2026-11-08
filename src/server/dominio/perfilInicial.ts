import type { PerfilEmpresa } from './entidades.js'

// Perfil da I9+ como a empresa informou: cadastrado numa base sem perfil (base nova ou depois de `db:reset`).
// Depois de criado, é do usuário: editar em Configurações › Perfil não volta a estes valores.
// Campos que a empresa ainda não informou ficam vazios.
export const PERFIL_INICIAL: Omit<PerfilEmpresa, 'atualizado_em'> = {
  id: 1,
  razao_social: 'SMS Indústria e Comércio de Produtos Elétricos e Serviços Ltda',
  nome_fantasia: 'I9+ Inovemais Baterias Elétricas e Energias',
  cnpj: '41.660.989/0001-47',
  cnae_principal: '2610-8/00',
  cnaes_secundarios: [],
  porte: 'EPP',
  natureza_juridica: 'Sociedade Empresária Limitada',
  data_fundacao: '2021-04-22',
  faturamento_anual: null,
  uf: 'PR',
  municipio: 'Curitiba',
  areas_atuacao: [],
  palavras_chave: [
    'Baterias de Íons-Lítio',
    'Armazenamento de Energia',
    'Mobilidade Elétrica',
    'Transição Energética',
    'Hardware e Software',
    'Inteligência Artificial',
    'Traçador de Curva I-V',
    'Economia Circular',
    'Second Life',
    'Segunda Vida',
    'Reciclagem Hidrometalúrgica',
    'Black Mass',
    'Logística Reversa',
    'Sistemas Fotovoltaicos',
    'ESG',
  ],
  possui_ict_parceira: false,
  certidoes_disponiveis: [],
  capacidade_contrapartida_percentual: null,
  valor_minimo_interesse: null,
  prazo_minimo_preparo_dias: null,
  site_url: null,
  instrucoes_extras: '',
}
