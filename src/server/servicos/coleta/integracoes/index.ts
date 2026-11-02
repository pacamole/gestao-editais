import type { Fonte, IntegracaoFonte as CodigoIntegracao } from '../../../dominio/entidades.js'
import type { ModeloLinguagemPorta } from '../../../portas/ModeloLinguagemPorta.js'
import { Embrapii } from './Embrapii.js'
import { Finep } from './Finep.js'
import type { IntegracaoFonte } from './IntegracaoFonte.js'

export type { ChamadaColetada, IntegracaoFonte } from './IntegracaoFonte.js'

/** Fontes pré-existentes (criadas pelo seed). Para incluir outra, crie a classe e acrescente aqui e no CHECK de fonte.integracao. */
export function criarIntegracoes(modelo: ModeloLinguagemPorta): Record<CodigoIntegracao, IntegracaoFonte> {
  return { FINEP: new Finep(), EMBRAPII: new Embrapii(modelo) }
}

export function integracaoDa(fonte: Pick<Fonte, 'integracao'>, integracoes: Record<CodigoIntegracao, IntegracaoFonte>): IntegracaoFonte | undefined {
  return fonte.integracao ? integracoes[fonte.integracao] : undefined
}
