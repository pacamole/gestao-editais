import { FONTE_CADASTRO, FONTE_LINK, FONTE_UPLOAD, FONTES_ENTRADA_MANUAL } from './coleta/fontesPadrao.js'
import { createHash } from 'node:crypto'
import { ehMarcadorDeTextoPdf, extrairPdf } from '../integracoes/pdf.js'
import type { Edital } from '../dominio/entidades.js'
import { ErroRegraNegocio, ErroValidacao } from '../dominio/erros.js'
import { AVISO_PAGINAS_SEM_TEXTO } from '../dominio/textoEdital.js'
import type { Repositorios } from '../repositorios/index.js'
import { CAMPOS_EDITAVEIS, type CampoEditavel } from '../../shared/camposEditaveis.js'
import { CAMPOS_EDITAL } from '../../shared/rotulos.js'
import type { CriarEditalResposta } from '../../shared/tipos/editais.js'
import { normalizarValor } from '../../shared/valoresCampo.js'

type RepositoriosEntrada = Pick<Repositorios, 'edital' | 'fonte'>

const LIMITE_UPLOAD_BYTES = 20 * 1024 * 1024

export type EntradaUpload = { arquivo_base64?: unknown; nome_arquivo?: unknown }
export type EntradaUrl = { url?: unknown }

// Cadastro de editais pelo usuário: PDF enviado, link colado ou campos digitados.
export class EntradaServico {
  constructor(
    private readonly repos: RepositoriosEntrada,
    // Leva o edital recém-criado até a decisão (leitura por IA, avaliação, status e avisos).
    private readonly processar: (editalId: string) => Promise<unknown>,
    private readonly lerPdf: typeof extrairPdf = extrairPdf,
  ) {}

  async criarPorUpload({ arquivo_base64, nome_arquivo }: EntradaUpload): Promise<CriarEditalResposta> {
    if (!arquivo_base64 || typeof arquivo_base64 !== 'string') throw new ErroValidacao('Arquivo PDF não fornecido.')

    const buffer = Buffer.from(arquivo_base64, 'base64')
    if (buffer.length > LIMITE_UPLOAD_BYTES) {
      throw new ErroValidacao(
        `O arquivo enviado (${(buffer.length / (1024 * 1024)).toFixed(1)} MB) excede o limite máximo permitido de 20 MB.`,
      )
    }

    let textoPdf
    try {
      textoPdf = await this.lerPdf(buffer)
    } catch {
      throw new ErroValidacao('Não foi possível ler este PDF. Verifique se o arquivo está íntegro e tente novamente.')
    }
    if (!textoPdf.paginas.some((pagina) => pagina.texto.trim())) {
      throw new ErroRegraNegocio(
        'Este PDF não contém texto selecionável. Aplique OCR ao documento e envie novamente para habilitar o chat.',
      )
    }

    const hash = createHash('sha256').update(buffer).digest('hex')
    const erroProcessamento = textoPdf.requerLeituraManual ? AVISO_PAGINAS_SEM_TEXTO : null

    const duplicado = this.repos.edital.buscarDuplicado({
      hash_documento: hash,
      url_documento: null,
      numero_edital: null,
      orgao_financiador: null,
    })
    if (duplicado) {
      if (!duplicado.texto_extraido?.trim() || ehMarcadorDeTextoPdf(duplicado.texto_extraido)) {
        this.repos.edital.atualizar(duplicado.id, { texto_extraido: textoPdf.texto, erro_processamento: erroProcessamento })
        return { ok: true, id: duplicado.id, duplicado: true, mensagem: 'O edital existente foi atualizado com o texto extraído do PDF.' }
      }
      return { ok: true, id: duplicado.id, duplicado: true, mensagem: 'Edital já cadastrado com o mesmo documento.' }
    }

    const nome = (typeof nome_arquivo === 'string' && nome_arquivo ? nome_arquivo : 'Edital Importado')
      .replace(/\.pdf$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim()

    const edital = this.repos.edital.inserir({
      titulo: nome.length > 5 ? nome : `Edital via Upload - ${nome}`,
      fonte_id: this.fonteInterna(FONTE_UPLOAD),
      hash_documento: hash,
      status: 'COLETADO',
      texto_extraido: textoPdf.texto,
      erro_processamento: erroProcessamento,
      retificado: false,
    })

    this.processarEmSegundoPlano(edital.id)
    return { ok: true, id: edital.id }
  }

  criarPorUrl({ url }: EntradaUrl): CriarEditalResposta {
    if (typeof url !== 'string' || !url.trim()) throw new ErroValidacao('Endereço URL do edital é obrigatório.')
    const endereco = url.trim()
    if (!/^https?:\/\//i.test(endereco)) throw new ErroValidacao('Informe uma URL válida iniciando com http:// ou https://.')

    // A mesma chamada pode já ter vindo da coleta, que guarda a página (url_original) e o PDF (url_documento).
    const duplicado =
      this.repos.edital.buscarDuplicado({
        hash_documento: null,
        url_documento: endereco,
        numero_edital: null,
        orgao_financiador: null,
      }) ?? this.repos.edital.buscarPorOrigem(endereco)
    if (duplicado) return { ok: true, id: duplicado.id, duplicado: true, mensagem: 'Edital já cadastrado com esta URL de origem.' }

    let dominio = 'Portal de Fomento'
    try {
      dominio = new URL(endereco).hostname.replace(/^www\./i, '')
    } catch {
      // mantém o nome genérico
    }

    const edital = this.repos.edital.inserir({
      titulo: `Chamada Pública identificada em ${dominio}`,
      fonte_id: this.fonteInterna(FONTE_LINK),
      url_original: endereco,
      url_documento: endereco,
      status: 'COLETADO',
      retificado: false,
    })

    this.processarEmSegundoPlano(edital.id)
    return { ok: true, id: edital.id }
  }

  async criarManual(dados: Record<string, unknown>): Promise<CriarEditalResposta> {
    const titulo = typeof dados.titulo === 'string' ? dados.titulo.trim() : ''
    if (!titulo) throw new ErroValidacao('O título do edital é obrigatório.')

    // Cada campo é convertido pelo tipo do catálogo; valor inválido recusa o cadastro em vez de gravar lixo.
    const campos: Partial<Edital> = {}
    for (const campo of CAMPOS_EDITAVEIS as readonly CampoEditavel[]) {
      if (dados[campo] === undefined) continue
      const { rotulo, tipo } = CAMPOS_EDITAL[campo]
      const resultado = normalizarValor(tipo, dados[campo], { separarTexto: true })
      if (!resultado.ok) throw new ErroValidacao(`${rotulo}: ${resultado.motivo}`)
      Object.assign(campos, { [campo]: resultado.valor })
    }

    const edital = this.repos.edital.inserir({
      ...campos,
      titulo,
      fonte_id: this.fonteInterna(FONTE_CADASTRO),
      status: 'COLETADO',
      retificado: false,
    })

    // Sem documento para ler: a avaliação usa os campos digitados e o status já sai definido.
    await this.processar(edital.id)
    return { ok: true, id: edital.id }
  }

  // A leitura por IA pode levar minutos: o usuário não espera; a tela mostra o edital "em processamento".
  private processarEmSegundoPlano(editalId: string): void {
    this.processar(editalId).catch((erro) => console.error('[entrada] falha ao processar o edital:', erro))
  }

  // A fonte informada, ou a padrão do tipo de entrada, ou a primeira cadastrada.
  // A origem de quem envia é sempre uma fonte interna (criada aqui se a base ainda não a tiver).
  private fonteInterna(nome: string): string {
    const existente = this.repos.fonte.buscarPorNome(nome)
    if (existente) return existente.id
    const { tipo } = FONTES_ENTRADA_MANUAL.find((f) => f.nome === nome)!
    return this.repos.fonte.inserir({ nome, tipo, ativo: true }).id
  }

}
