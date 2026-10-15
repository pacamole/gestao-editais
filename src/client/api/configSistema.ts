import type {
  ConfigSistemaResposta,
  SalvarConfigSistemaEntrada,
  TestarEmailResposta,
  TestarOllamaResposta,
} from '../../shared/tipos/configSistema'
import { requisicao } from './cliente'

export const configSistema = {
  obter: () => requisicao<ConfigSistemaResposta>('/api/config/sistema'),

  salvar: (dados: SalvarConfigSistemaEntrada) =>
    requisicao<ConfigSistemaResposta>('/api/config/sistema', { metodo: 'PUT', corpo: dados }),

  testarEmail: (para: string) =>
    requisicao<TestarEmailResposta>('/api/config/sistema/testar-email', { metodo: 'POST', corpo: { para } }),

  testarOllama: (url?: string) =>
    requisicao<TestarOllamaResposta>('/api/config/sistema/testar-ollama', { metodo: 'POST', corpo: { url } }),
}
