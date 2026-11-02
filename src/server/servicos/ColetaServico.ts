import { transacao } from '../db/index.js'
import type { Fonte, IntegracaoFonte as CodigoIntegracao } from '../dominio/entidades.js'
import type { Repositorios } from '../repositorios/index.js'
import { baixar } from '../integracoes/http.js'
import { documentoPrincipal } from './coleta/documentoPrincipal.js'
import { explicarFalhaColeta } from './coleta/explicarFalha.js'
import { integracaoDa, type ChamadaColetada, type IntegracaoFonte } from './coleta/integracoes/index.js'
import type { DescobertaFonteServico } from './DescobertaFonteServico.js'
import type { RegistroDocumentoServico } from './RegistroDocumentoServico.js'

type RepositoriosColeta = Pick<Repositorios, 'fonte' | 'coletaExecucao'>

const ehPdf = (url: string) => /\.pdf($|\?)/i.test(url)

/**
 * Busca as chamadas abertas de uma fonte e entrega cada uma ao registro (com o PDF, quando houver).
 * Fonte integrada: o adaptador dela (API/feed). Fonte do usuário: a leitura descoberta na verificação.
 * Cada execução fica anotada (sucesso, parcial ou falha) para o painel de saúde e o alerta E06.
 */
export class ColetaServico {
  private readonly emExecucao = new Set<string>()

  constructor(
    private readonly repos: RepositoriosColeta,
    private readonly registro: RegistroDocumentoServico,
    private readonly descoberta: Pick<DescobertaFonteServico, 'ler'>,
    private readonly integracoes: Record<CodigoIntegracao, IntegracaoFonte>,
    private readonly baixarArquivo = baixar,
  ) {}

  async coletar(fonte: Fonte): Promise<void> {
    if (this.emExecucao.has(fonte.id)) return
    this.emExecucao.add(fonte.id)
    const execucao = this.repos.coletaExecucao.inserir({ fonte_id: fonte.id })
    let itens = 0
    let processados = 0
    const erros: string[] = []
    try {
      for (const chamada of await this.chamadasAbertas(fonte)) {
        try {
          const resultado = await this.registrar(fonte, chamada)
          if (resultado !== 'DUPLICADO') itens++
          processados++
        } catch (erro) {
          erros.push(`Chamada "${chamada.titulo.slice(0, 80)}": ${explicarFalhaColeta(erro)}`)
        }
      }
    } catch (erro) {
      erros.push(explicarFalhaColeta(erro))
    } finally {
      const status = erros.length ? (processados ? 'PARCIAL' : 'FALHA') : 'SUCESSO'
      const instante = new Date().toISOString()
      transacao(() => {
        this.repos.coletaExecucao.atualizar(execucao.id, {
          finalizada_em: instante,
          status,
          itens_coletados: itens,
          mensagem_erro: erros.join('\n') || null,
        })
        this.repos.fonte.atualizar(fonte.id, {
          ultima_coleta_em: instante,
          ultimo_status: status,
          ultima_mensagem_erro: erros.join('\n') || null,
        })
      })
      this.emExecucao.delete(fonte.id)
    }
    if (erros.length) throw new Error(erros.join('\n'))
  }

  private async chamadasAbertas(fonte: Fonte): Promise<ChamadaColetada[]> {
    const integracao = integracaoDa(fonte, this.integracoes)
    if (integracao) return integracao.listarChamadas()

    if (fonte.tipo !== 'SCRAPER' && fonte.tipo !== 'RSS') throw new Error('Esta fonte não tem busca automática.')
    if (!fonte.url_base) throw new Error('A fonte não tem endereço cadastrado.')
    const { chamadas, redescoberta } = await this.descoberta.ler({
      nome: fonte.nome,
      url: fonte.url_base,
      formato: fonte.formato_dados,
      enderecoDados: fonte.endereco_dados,
    })
    // A página mudou de jeito de publicar (ex.: passou a usar uma API): guarda o novo caminho.
    if (redescoberta) {
      this.repos.fonte.atualizar(fonte.id, { formato_dados: redescoberta.formato, endereco_dados: redescoberta.enderecoDados })
    }
    return chamadas.map((c) => ({
      titulo: c.titulo,
      urlOriginal: c.url,
      urlDocumento: ehPdf(c.url) ? c.url : null,
      numero: c.numero,
      textoAlternativo: c.texto ?? null,
    }))
  }

  // Acha o PDF (informado, ou procurado na página da chamada) e registra. Sem PDF, registra com o texto da fonte.
  private async registrar(fonte: Fonte, chamada: ChamadaColetada) {
    let pdf = chamada.urlDocumento
    if (!pdf && chamada.procurarPdfNaPagina !== false) {
      try {
        pdf = documentoPrincipal(Buffer.from(await this.baixarArquivo(chamada.urlOriginal)).toString('utf8'), chamada.urlOriginal) ?? null
      } catch (erro) {
        if (!chamada.textoAlternativo) throw erro
      }
    }
    if (!pdf && !chamada.textoAlternativo) {
      throw new Error('não achei o PDF do edital na página; se ele interessar, envie o link em Nova entrada.')
    }
    return this.registro.registrar(fonte, { ...chamada, urlDocumento: pdf }, pdf ? await this.baixarArquivo(pdf) : null)
  }
}
