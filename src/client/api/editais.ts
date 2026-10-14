import type {
  CriarEditalEntrada,
  CriarEditalResposta,
  CriarManualEntrada,
  CriarPorUploadEntrada,
  CriarPorUrlEntrada,
  FiltrosEditais,
  ListaEditaisResposta,
  LoteEntrada,
  LoteResposta,
} from '../../shared/tipos/editais'
import { montarUrl, requisicao } from './cliente'

// Converte os filtros da tela nos parâmetros da rota; "sem filtro" vira vazio e é omitido.
function queryDosFiltros(f: FiltrosEditais) {
  return {
    busca: f.busca.trim(),
    status: f.status !== 'TODOS' ? f.status : '',
    elegibilidade: f.elegibilidade !== 'TODAS' ? f.elegibilidade : '',
    faixaFit: f.faixaFit !== 'TODAS' ? f.faixaFit : '',
    modalidade: f.modalidade !== 'TODAS' ? f.modalidade : '',
    fonte_id: f.fonteId !== 'TODAS' ? f.fonteId : '',
    prazoDe: f.prazoDe,
    prazoAte: f.prazoAte,
    somentePrazoAberto: f.somentePrazoAberto ? '1' : '',
    novosSemana: f.novosSemana ? '1' : '',
    prazoUrgente: f.prazoUrgente ? '1' : '',
  }
}

const criar = (dados: CriarEditalEntrada) =>
  requisicao<CriarEditalResposta>('/api/editais', { metodo: 'POST', corpo: dados })

export const editais = {
  listar: (filtros: FiltrosEditais, pagina: number, limite: number) =>
    requisicao<ListaEditaisResposta>('/api/editais', {
      query: { ...queryDosFiltros(filtros), pagina, limite },
    }),

  // Endereço da planilha CSV da visão filtrada (aberto em nova aba).
  urlCsv: (filtros: FiltrosEditais) => montarUrl('/api/editais', { ...queryDosFiltros(filtros), formato: 'csv' }),

  lote: (dados: LoteEntrada) =>
    requisicao<LoteResposta>('/api/editais/lote', { metodo: 'POST', corpo: dados }),

  criarPorUpload: (dados: Omit<CriarPorUploadEntrada, 'tipo'>) => criar({ tipo: 'UPLOAD_PDF', ...dados }),

  criarPorUrl: (dados: Omit<CriarPorUrlEntrada, 'tipo'>) => criar({ tipo: 'URL', ...dados }),

  criarManual: (dados: Omit<CriarManualEntrada, 'tipo'>) => criar({ tipo: 'MANUAL', ...dados }),
}
