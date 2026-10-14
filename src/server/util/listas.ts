export function normalizarLista(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.filter((v) => v != null).map((v) => String(v).trim()).filter(Boolean)
  if (typeof valor === 'string') return valor.split(',').map((v) => v.trim()).filter(Boolean)
  return []
}
