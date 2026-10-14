import type {
  DetalheEditalResposta,
  ExtracaoResposta,
  RevisarEntrada,
  RevisarResposta,
  SalvarCamposEntrada,
  SalvarCamposResposta,
} from '../../shared/tipos/edital'
import { requisicao } from './cliente'

const base = (id: string) => `/api/editais/${encodeURIComponent(id)}`

export const edital = {
  obter: (id: string) => requisicao<DetalheEditalResposta>(base(id)),

  salvarCampos: (id: string, campos: SalvarCamposEntrada['campos']) =>
    requisicao<SalvarCamposResposta>(`${base(id)}/campos`, { metodo: 'PATCH', corpo: { campos } }),

  revisar: (id: string, dados: RevisarEntrada) =>
    requisicao<RevisarResposta>(`${base(id)}/revisao`, { metodo: 'POST', corpo: dados }),

  // Analisa o texto já extraído (PDF) com a IA.
  extrairDados: (id: string) =>
    requisicao<ExtracaoResposta>(`${base(id)}/extrair-dados`, { metodo: 'POST' }),

  // Lê a página pública cadastrada e extrai os campos. Erro 502 com dados.textoSalvo = página salva.
  lerUrl: (id: string) =>
    requisicao<ExtracaoResposta>(`${base(id)}/ler-url`, { metodo: 'POST' }),
}
