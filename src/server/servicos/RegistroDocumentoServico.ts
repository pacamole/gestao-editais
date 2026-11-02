import { createHash } from 'node:crypto'
import { novoId, transacao } from '../db/index.js'
import type { Edital, Fonte } from '../dominio/entidades.js'
import type { DocumentoRepositorio } from '../repositorios/DocumentoRepositorio.js'
import type { Repositorios } from '../repositorios/index.js'
import { extrairPdf } from '../integracoes/pdf.js'
import { MARCADOR_DADO_ESTRUTURADO } from '../../shared/camposEditaveis.js'

type RepositoriosRegistro = Pick<Repositorios, 'edital' | 'editalVersao' | 'evidencia'>

export type DocumentoColetado = {
  titulo: string
  /** Página da chamada no portal (ou a lista, quando a chamada não tem página própria). */
  urlOriginal: string
  /** Endereço do PDF; null quando a fonte não publica o documento. */
  urlDocumento: string | null
  numero?: string | null
  /** Identidade da chamada na fonte (ex.: id na API da FINEP). Tem precedência sobre URL e hash. */
  idExterno?: string | null
  /** Texto usado no lugar do PDF quando não há documento (ex.: descrição da chamada na API). */
  textoAlternativo?: string | null
  /** Campos que a fonte já informa de forma estruturada; gravados com evidência própria e não refeitos pela IA. */
  camposEstruturados?: Partial<Edital>
}

export type ResultadoRegistro = 'NOVO' | 'DUPLICADO' | 'RETIFICADO'

const igual = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

// Decide o que fazer com uma chamada coletada: ignorar (já temos), registrar como edital novo
// ou como nova versão de um edital que já existia (retificação).
export class RegistroDocumentoServico {
  constructor(
    private readonly repos: RepositoriosRegistro,
    private readonly documentos: DocumentoRepositorio,
    private readonly lerPdf: typeof extrairPdf = extrairPdf,
  ) {}

  /** `arquivo` é o PDF baixado; null registra a chamada com `textoAlternativo` (fonte sem documento). */
  async registrar(fonte: Fonte, documento: DocumentoColetado, arquivo: Uint8Array | null): Promise<ResultadoRegistro> {
    const textoSemPdf = arquivo ? null : documento.textoAlternativo?.trim() || documento.titulo
    const hash = createHash('sha256')
      .update(arquivo ?? Buffer.from(textoSemPdf!, 'utf8'))
      .digest('hex')

    // Com identidade da fonte, ela manda; sem, o PDF (hash/URL) e a página original identificam a chamada.
    // O número não entra: o mesmo órgão repete "01/2026" em séries diferentes, e juntaria chamadas distintas.
    const existente = documento.idExterno
      ? this.repos.edital.buscarPorIdExterno(fonte.id, documento.idExterno)
      : (this.repos.edital.buscarDuplicado({
          hash_documento: hash,
          url_documento: documento.urlDocumento,
          numero_edital: null,
          orgao_financiador: null,
        }) ?? this.repos.edital.buscarPorOrigem(documento.urlOriginal))

    if (existente?.hash_documento === hash) {
      // Mesmo documento: só acompanha o que a fonte mudou nos dados estruturados (ex.: prazo prorrogado).
      this.atualizarEstruturados(existente, documento.camposEstruturados)
      return 'DUPLICADO'
    }

    let textoExtraido = textoSemPdf
    let aviso: string | null = null
    if (arquivo) {
      const texto = await this.lerPdf(arquivo)
      await this.documentos.salvarPdf(hash, arquivo)
      textoExtraido = texto.texto
      aviso = texto.requerLeituraManual ? 'Requer leitura manual: a maior parte das páginas não tem camada de texto.' : null
    }

    const campos = {
      titulo: documento.titulo,
      fonte_id: fonte.id,
      orgao_financiador: fonte.nome,
      numero_edital: documento.numero ?? null,
      url_original: documento.urlOriginal,
      url_documento: documento.urlDocumento,
      id_externo: documento.idExterno ?? null,
      hash_documento: hash,
      texto_extraido: textoExtraido,
      erro_processamento: aviso,
      ...documento.camposEstruturados,
    }

    return transacao(() => {
      if (existente) {
        this.repos.editalVersao.inserir({
          edital_id: existente.id,
          hash_documento: existente.hash_documento,
          dados: existente,
        })
        this.repos.edital.atualizar(existente.id, { ...campos, retificado: true, status: 'COLETADO' })
        this.marcarEstruturados(existente.id, documento.camposEstruturados)
        return 'RETIFICADO'
      }
      const novo = this.repos.edital.inserir({ ...campos, status: 'COLETADO' })
      this.marcarEstruturados(novo.id, documento.camposEstruturados)
      return 'NOVO'
    })
  }

  private atualizarEstruturados(edital: Edital, campos: Partial<Edital> | undefined): void {
    if (!campos) return
    const mudou = Object.fromEntries(Object.entries(campos).filter(([k, v]) => !igual(edital[k as keyof Edital], v)))
    if (!Object.keys(mudou).length) return
    transacao(() => {
      this.repos.edital.atualizar(edital.id, mudou)
      this.marcarEstruturados(edital.id, mudou)
    })
  }

  // Evidência "informado pela fonte" em cada campo estruturado preenchido: a IA não os refaz.
  private marcarEstruturados(editalId: string, campos: Partial<Edital> | undefined): void {
    for (const [campo, valor] of Object.entries(campos ?? {})) {
      this.repos.evidencia.excluirDoCampo(editalId, campo)
      if (valor == null) continue
      this.repos.evidencia.inserir({
        id: novoId(),
        edital_id: editalId,
        campo,
        trecho_literal: MARCADOR_DADO_ESTRUTURADO,
        pagina: null,
        confianca: 'ALTA',
      })
    }
  }
}
