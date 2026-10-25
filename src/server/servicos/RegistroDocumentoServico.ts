import { createHash } from 'node:crypto'
import { transacao } from '../db/index.js'
import type { Fonte } from '../dominio/entidades.js'
import type { DocumentoRepositorio } from '../repositorios/DocumentoRepositorio.js'
import type { Repositorios } from '../repositorios/index.js'
import { extrairPdf } from '../integracoes/pdf.js'

type RepositoriosRegistro = Pick<Repositorios, 'edital' | 'editalVersao'>

export type DocumentoColetado = {
  titulo: string
  /** Página da chamada no portal. */
  urlOriginal: string
  /** Endereço do PDF. */
  urlDocumento: string
  numero?: string | null
}

export type ResultadoRegistro = 'NOVO' | 'DUPLICADO' | 'RETIFICADO'

// Decide o que fazer com um PDF coletado: ignorar (já temos), registrar como edital novo
// ou como nova versão de um edital que já existia (retificação).
export class RegistroDocumentoServico {
  constructor(
    private readonly repos: RepositoriosRegistro,
    private readonly documentos: DocumentoRepositorio,
    private readonly lerPdf: typeof extrairPdf = extrairPdf,
  ) {}

  async registrar(fonte: Fonte, documento: DocumentoColetado, arquivo: Uint8Array): Promise<ResultadoRegistro> {
    const hash = createHash('sha256').update(arquivo).digest('hex')
    // A página original também identifica uma chamada cujo PDF foi substituído por outra URL.
    const existente =
      this.repos.edital.buscarDuplicado({
        hash_documento: hash,
        url_documento: documento.urlDocumento,
        numero_edital: documento.numero ?? null,
        orgao_financiador: fonte.nome,
      }) ?? this.repos.edital.buscarPorOrigem(documento.urlOriginal)
    if (existente?.hash_documento === hash) return 'DUPLICADO'

    const texto = await this.lerPdf(arquivo)
    await this.documentos.salvarPdf(hash, arquivo)
    const campos = {
      titulo: documento.titulo,
      fonte_id: fonte.id,
      orgao_financiador: fonte.nome,
      numero_edital: documento.numero ?? null,
      url_original: documento.urlOriginal,
      url_documento: documento.urlDocumento,
      hash_documento: hash,
      texto_extraido: texto.texto,
      erro_processamento: texto.requerLeituraManual ? 'Requer leitura manual: página sem camada de texto.' : null,
    }

    return transacao(() => {
      if (existente) {
        this.repos.editalVersao.inserir({
          edital_id: existente.id,
          hash_documento: existente.hash_documento,
          dados: existente,
        })
        this.repos.edital.atualizar(existente.id, { ...campos, retificado: true, status: 'COLETADO' })
        return 'RETIFICADO'
      }
      this.repos.edital.inserir({ ...campos, status: 'COLETADO' })
      return 'NOVO'
    })
  }
}
