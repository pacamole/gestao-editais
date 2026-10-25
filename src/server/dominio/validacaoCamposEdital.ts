import type { Edital } from './entidades.js'
import { CAMPOS_EDITAVEIS, MARCADOR_EDICAO_MANUAL, type CampoEditavel } from '../../shared/camposEditaveis.js'
import { CAMPOS_EDITAL } from '../../shared/rotulos.js'
import { normalizarValor } from '../../shared/valoresCampo.js'

export { CAMPOS_EDITAVEIS, MARCADOR_EDICAO_MANUAL, type CampoEditavel }

// Valida o que o usuário digitou, campo a campo, pelo tipo definido no catálogo.
export function validarCamposManuais(valor: unknown): Partial<Edital> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    throw new Error('Informe os campos que deseja atualizar.')
  }
  const alteracoes: Partial<Edital> = {}
  for (const [campo, item] of Object.entries(valor as Record<string, unknown>)) {
    if (!(CAMPOS_EDITAVEIS as readonly string[]).includes(campo)) {
      throw new Error(`O campo "${campo}" não pode ser editado por este formulário.`)
    }
    const { rotulo, tipo } = CAMPOS_EDITAL[campo as CampoEditavel]
    const resultado = normalizarValor(tipo, item)
    if (!resultado.ok) throw new Error(`${rotulo}: ${resultado.motivo}`)
    Object.assign(alteracoes, { [campo]: resultado.valor })
  }
  if (!Object.keys(alteracoes).length) throw new Error('Informe ao menos um campo para salvar.')
  return alteracoes
}
