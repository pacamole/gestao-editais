import conteudoUso from '../../../../docs/MANUAL-DE-USO.md?raw'
import conteudoIntegracoes from '../../../../docs/MANUAL-DE-INTEGRACOES.md?raw'
import conteudoConfiguracoes from '../../../../docs/MANUAL-DE-CONFIGURACOES.md?raw'

export const manuaisLista = [
  {
    id: 'uso',
    titulo: 'Documentação de Uso',
    nomeArquivo: 'MANUAL-DE-USO.md',
    conteudo: conteudoUso,
  },
  {
    id: 'integracao',
    titulo: 'Manual de Integrações',
    nomeArquivo: 'MANUAL-DE-INTEGRACOES.md',
    conteudo: conteudoIntegracoes,
  },
  {
    id: 'configuracao',
    titulo: 'Manual de Configurações',
    nomeArquivo: 'MANUAL-DE-CONFIGURACOES.md',
    conteudo: conteudoConfiguracoes,
  },
]
