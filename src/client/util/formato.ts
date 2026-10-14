// Formatadores de exibição usados pelas páginas. `vazio` é o texto para valor ausente.

// 'AAAA-MM-DD' é lido como data local (new Date() o trataria como UTC e mostraria o dia anterior).
function paraData(valor: string): Date {
  const soData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor)
  return soData ? new Date(Number(soData[1]), Number(soData[2]) - 1, Number(soData[3])) : new Date(valor)
}

export function formatarData(valor: string | null | undefined, vazio = '—'): string {
  if (!valor) return vazio
  const d = paraData(valor)
  return Number.isNaN(d.getTime()) ? valor : d.toLocaleDateString('pt-BR')
}

export function formatarDataHora(valor: string | null | undefined, vazio = '—'): string {
  if (!valor) return vazio
  const d = paraData(valor)
  return Number.isNaN(d.getTime()) ? valor : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function formatarMoeda(valor: number | null | undefined, vazio = '—'): string {
  if (valor == null || !Number.isFinite(valor)) return vazio
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Texto para qualquer valor: listas viram "a, b" (vazia = semLista), booleanos viram Sim/Não.
export function rotuloValor(valor: unknown, vazio = '—', semLista = 'Sem restrição'): string {
  if (valor == null || valor === '') return vazio
  if (Array.isArray(valor)) return valor.length ? valor.join(', ') : semLista
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não'
  return String(valor)
}

// Dias inteiros de hoje até a data (negativo = já passou).
export function diasAte(valor: string | null | undefined): number | null {
  if (!valor) return null
  const alvo = paraData(valor)
  if (Number.isNaN(alvo.getTime())) return null
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  alvo.setHours(0, 0, 0, 0)
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000)
}
