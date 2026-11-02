import type { IntegracaoFonte as CodigoIntegracao } from '../../../dominio/entidades.js'
import type { DocumentoColetado } from '../../RegistroDocumentoServico.js'

/** Uma chamada aberta como a integração a entrega para registro. */
export type ChamadaColetada = DocumentoColetado & {
  /** false quando a chamada não tem página própria onde procurar o PDF (ex.: FINEP, cujo documento vem da API). */
  procurarPdfNaPagina?: boolean
}

/**
 * Fonte pré-existente: um órgão com dados estruturados (API ou feed), lido por código próprio.
 * Fonte nova = uma classe que implementa isto e uma linha em integracoes/index.ts.
 */
export interface IntegracaoFonte {
  readonly codigo: CodigoIntegracao
  readonly nome: string
  /** Endereço mostrado ao usuário (de onde os dados vêm). */
  readonly endereco: string
  /** Chamadas com inscrição aberta hoje. */
  listarChamadas(): Promise<ChamadaColetada[]>
}
