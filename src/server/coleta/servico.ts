import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { arquivoBanco } from '../paths.js'
import { transacao } from '../db/index.js'
import type { Fonte } from '../entidades.js'
import type { Repositorios } from '../repositorios/index.js'
import { extrairPdf, type TextoPdf } from './pdf.js'
import { FONTES_AUTOMATICAS, type Portal } from './fontes.js'
import { baixar } from './http.js'
import { documentoPrincipal, listarPublicacoes } from './portais.js'

export type Documento = { titulo: string; urlOriginal: string; urlDocumento: string; numero?: string | null }
const mensagem = (erro: unknown) => erro instanceof Error ? erro.message : String(erro)

export class ColetaServico {
  private readonly emExecucao = new Set<string>()
  constructor(
    private readonly repos: Repositorios,
    private readonly baixarArquivo = baixar,
    private readonly extrair = extrairPdf,
  ) {}

  async registrar(fonte: Fonte, documento: Documento, arquivo: Uint8Array): Promise<'NOVO' | 'DUPLICADO' | 'RETIFICADO'> {
    const hash = createHash('sha256').update(arquivo).digest('hex')
    // A página original também identifica uma chamada cujo PDF foi substituído por outra URL.
    const existente = this.repos.edital.buscarDuplicado({ hash_documento: hash, url_documento: documento.urlDocumento, numero_edital: documento.numero ?? null, orgao_financiador: fonte.nome })
      ?? this.repos.edital.buscarPorOrigem(documento.urlOriginal)
    if (existente?.hash_documento === hash) return 'DUPLICADO'
    const texto: TextoPdf = await this.extrair(arquivo)
    const pasta = path.join(path.dirname(arquivoBanco), 'documentos')
    await mkdir(pasta, { recursive: true })
    await writeFile(path.join(pasta, `${hash}.pdf`), arquivo)
    const campos = {
      titulo: documento.titulo, fonte_id: fonte.id, orgao_financiador: fonte.nome,
      numero_edital: documento.numero ?? null, url_original: documento.urlOriginal,
      url_documento: documento.urlDocumento, hash_documento: hash, texto_extraido: texto.texto,
      erro_processamento: texto.requerLeituraManual ? 'Requer leitura manual: página sem camada de texto.' : null,
    }
    return transacao(() => {
      if (existente) {
        this.repos.editalVersao.inserir({ edital_id: existente.id, hash_documento: existente.hash_documento, dados: existente })
        this.repos.edital.atualizar(existente.id, { ...campos, retificado: true, status: 'COLETADO' })
        return 'RETIFICADO'
      }
      this.repos.edital.inserir({ ...campos, status: 'COLETADO' })
      return 'NOVO'
    })
  }

  async coletar(fonte: Fonte): Promise<void> {
    if (this.emExecucao.has(fonte.id)) return
    this.emExecucao.add(fonte.id)
    const execucao = this.repos.coletaExecucao.inserir({ fonte_id: fonte.id })
    let itens = 0
    let processados = 0
    const erros: string[] = []
    try {
      if (!(fonte.nome in FONTES_AUTOMATICAS) || fonte.tipo !== 'SCRAPER') throw new Error('Fonte sem coletor automático.')
      const url = fonte.url_base ?? FONTES_AUTOMATICAS[fonte.nome as Portal]
      const html = Buffer.from(await this.baixarArquivo(url)).toString('utf8')
      const publicacoes = listarPublicacoes(fonte.nome as Portal, html, url)
      if (!publicacoes.length) throw new Error('Nenhuma chamada identificada; confira a estrutura do portal.')
      for (const publicacao of publicacoes) {
        try {
          const detalhe = Buffer.from(await this.baixarArquivo(publicacao.url)).toString('utf8')
          const pdf = documentoPrincipal(detalhe, publicacao.url)
          if (!pdf) throw new Error('PDF principal não localizado; requer entrada manual.')
          // A Embrapii repete número/ano em séries distintas (Unidades, Centros e chamadas internas).
          // Nesse portal, aguardar a extração estruturada; não inferir uma identidade ambígua.
          const numero = fonte.nome === 'CNPq' ? publicacao.titulo.match(/(?:n[º°o.]|número)\s*(\d+\s*\/\s*\d{4})/i)?.[1]?.replace(/\s/g, '') ?? null : null
          const resultado = await this.registrar(fonte, { titulo: publicacao.titulo, urlOriginal: publicacao.url, urlDocumento: pdf, numero }, await this.baixarArquivo(pdf))
          if (resultado !== 'DUPLICADO') itens++
          processados++
        } catch (erro) { erros.push(`${publicacao.url}: ${mensagem(erro)}`) }
      }
    } catch (erro) { erros.push(mensagem(erro)) }
    finally {
      const status = erros.length ? (processados ? 'PARCIAL' : 'FALHA') : 'SUCESSO'
      const instante = new Date().toISOString()
      transacao(() => {
        this.repos.coletaExecucao.atualizar(execucao.id, { finalizada_em: instante, status, itens_coletados: itens, mensagem_erro: erros.join('\n') || null })
        this.repos.fonte.atualizar(fonte.id, { ultima_coleta_em: instante, ultimo_status: status, ultima_mensagem_erro: erros.join('\n') || null })
      })
      this.emExecucao.delete(fonte.id)
    }
    if (erros.length) throw new Error(erros.join('\n'))
  }
}
