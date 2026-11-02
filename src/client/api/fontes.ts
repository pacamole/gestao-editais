import type {
  ExcluirFonteResposta,
  FonteResposta,
  ListaFontesResposta,
  OrigensResposta,
  ProcuraListagemResposta,
  SalvarFonteEntrada,
  VerificacaoFonteResposta,
} from '../../shared/tipos/fontes'
import { requisicao } from './cliente'

export const fontes = {
  listar: () => requisicao<ListaFontesResposta>('/api/fontes'),

  origens: () => requisicao<OrigensResposta>('/api/fontes/origens'),

  salvar: (dados: SalvarFonteEntrada) =>
    requisicao<FonteResposta>('/api/fontes', { metodo: 'POST', corpo: dados }),

  alternarAtivo: (id: string) =>
    requisicao<FonteResposta>(`/api/fontes/${encodeURIComponent(id)}/ativo`, { metodo: 'PATCH' }),

  verificar: (dados: { nome: string; url_base: string }) =>
    requisicao<VerificacaoFonteResposta>('/api/fontes/verificar', { metodo: 'POST', corpo: dados }),

  procurarListagem: (dados: { nome: string; url_base: string }) =>
    requisicao<ProcuraListagemResposta>('/api/fontes/procurar-listagem', { metodo: 'POST', corpo: dados }),

  excluir: (id: string) =>
    requisicao<ExcluirFonteResposta>(`/api/fontes/${encodeURIComponent(id)}`, { metodo: 'DELETE' }),

  coletar: (id: string) =>
    requisicao<FonteResposta>(`/api/fontes/${encodeURIComponent(id)}/coletar`, { metodo: 'POST' }),
}
