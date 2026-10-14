import type { FiltrosEditais } from '../../../shared/tipos/editais'

export const FILTROS_PADRAO: FiltrosEditais = {
  busca: '',
  status: 'TODOS',
  elegibilidade: 'TODAS',
  faixaFit: 'TODAS',
  modalidade: 'TODAS',
  fonteId: 'TODAS',
  prazoDe: '',
  prazoAte: '',
  somentePrazoAberto: false,
  novosSemana: false,
  prazoUrgente: false,
}

// Filtros iniciais a partir da URL (ex.: links vindos do dashboard).
export function filtrosDaUrl(params: URLSearchParams): FiltrosEditais {
  return {
    busca: params.get('busca') ?? FILTROS_PADRAO.busca,
    status: params.get('status') ?? FILTROS_PADRAO.status,
    elegibilidade: params.get('elegibilidade') ?? FILTROS_PADRAO.elegibilidade,
    faixaFit: params.get('faixaFit') ?? FILTROS_PADRAO.faixaFit,
    modalidade: params.get('modalidade') ?? FILTROS_PADRAO.modalidade,
    fonteId: params.get('fonte_id') ?? FILTROS_PADRAO.fonteId,
    prazoDe: params.get('prazoDe') ?? FILTROS_PADRAO.prazoDe,
    prazoAte: params.get('prazoAte') ?? FILTROS_PADRAO.prazoAte,
    somentePrazoAberto: params.get('somentePrazoAberto') === '1',
    novosSemana: params.get('novos_semana') === '1',
    prazoUrgente: params.get('prazo_urgente') === '1',
  }
}

// Filtros que a URL sobrescreve quando muda com a página já aberta (só os presentes nela).
export function filtrosAlteradosPelaUrl(params: URLSearchParams): Partial<FiltrosEditais> {
  const parcial: Partial<FiltrosEditais> = {}
  const status = params.get('status')
  const elegibilidade = params.get('elegibilidade')
  const faixaFit = params.get('faixaFit')
  if (status !== null) parcial.status = status
  if (params.has('novos_semana')) parcial.novosSemana = params.get('novos_semana') === '1'
  if (params.has('prazo_urgente')) parcial.prazoUrgente = params.get('prazo_urgente') === '1'
  if (elegibilidade !== null) parcial.elegibilidade = elegibilidade
  if (faixaFit !== null) parcial.faixaFit = faixaFit
  return parcial
}

// Aplica alterações e mantém o mesmo objeto quando nada muda (evita recarregar à toa).
export function aplicarFiltros(atual: FiltrosEditais, parcial: Partial<FiltrosEditais>): FiltrosEditais {
  const chaves = Object.keys(parcial) as (keyof FiltrosEditais)[]
  return chaves.some((c) => parcial[c] !== atual[c]) ? { ...atual, ...parcial } : atual
}
