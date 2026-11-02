import { load } from 'cheerio'
import { baixar } from '../integracoes/http.js'
import { abrirPagina, ErroNavegadorIndisponivel } from '../integracoes/navegador.js'
import type { ModeloLinguagemPorta } from '../portas/ModeloLinguagemPorta.js'
import type { FormatoDadosFonte } from '../../shared/tipos/dominio.js'
import { hoje } from '../../shared/datas.js'
import {
  candidatosDoJson,
  feedsAnunciados,
  linksDoFeed,
  listarLinks,
  pareceFeed,
  resumoDaPagina,
  type LinkCandidato,
} from './coleta/leitorFonte.js'
import {
  interpretarLeituraDaPagina,
  interpretarProcuraDaListagem,
  mensagensDeLeituraDaPagina,
  mensagensDeProcuraDaListagem,
  type ChamadaEscolhida,
  type TipoPagina,
} from './ia/promptsColeta.js'

/** O que a verificação concluiu sobre um endereço: o que ele é e, se for lista, como lê-lo e o que há nele. */
export type AnaliseFonte = {
  url: string
  tipo: TipoPagina
  motivo: string
  formato: FormatoDadosFonte
  /** De onde os dados vêm de fato: a própria página, o feed anunciado ou a API que a página usa. */
  enderecoDados: string
  chamadas: ChamadaEscolhida[]
  /** Aviso para o usuário quando a leitura não foi completa (ex.: navegador não instalado). */
  aviso?: string
}

export type ProcuraListagem = { encontrada: AnaliseFonte | null; tentativas: { url: string; resultado: string }[] }

type Leitura = { formato: FormatoDadosFonte; enderecoDados: string; titulo: string; trecho: string; candidatos: LinkCandidato[] }

const texto = (bytes: Uint8Array) => Buffer.from(bytes).toString('utf8')

// HTML que quase não tem texto e carrega aplicativos: a lista é montada por JavaScript depois de abrir.
function montadaPorJavascript(html: string): boolean {
  const $ = load(html)
  const scripts = $('script[src]').length
  $('nav,header,footer,script,style,noscript').remove()
  const conteudo = $('main').text() || $('body').text()
  return scripts >= 5 || conteudo.replace(/\s+/g, ' ').trim().length < 1500
}

// O feed só substitui a página quando é dela: /chamadas-publicas/feed/ para /chamadas-publicas/,
// e não o feed geral de notícias do site, que todo WordPress anuncia em todas as páginas.
function feedDaPropriaPagina(feeds: string[], pagina: string): string | undefined {
  const caminho = new URL(pagina).pathname.replace(/\/+$/, '')
  if (!caminho) return undefined
  return feeds.find((f) => new URL(f).pathname.startsWith(`${caminho}/`))
}

/**
 * Descobre como ler uma fonte que o usuário cadastrou e pede à IA o que a página é e quais chamadas estão abertas.
 * Ordem: feed (se a página é um feed ou anuncia o próprio) → links do HTML → navegador invisível, usando a API
 * que a página consulta (sites montados por JavaScript).
 */
export class DescobertaFonteServico {
  constructor(
    private readonly modelo: ModeloLinguagemPorta,
    private readonly baixarArquivo = baixar,
    private readonly abrirNoNavegador = abrirPagina,
  ) {}

  /** Verificação completa de um endereço (cadastro de fonte). */
  async analisar(url: string, nomeFonte = ''): Promise<AnaliseFonte> {
    const conteudo = texto(await this.baixarArquivo(url))
    const estatica = await this.leituraEstatica(url, conteudo)
    const analise = await this.classificar(url, nomeFonte, estatica)
    if (analise.tipo === 'LISTA' && analise.chamadas.length) return analise
    if (estatica.formato === 'FEED' || !montadaPorJavascript(conteudo)) return analise

    // A página parece montada por JavaScript: abre no navegador e usa os dados que ela carrega.
    let dinamica: Leitura | null
    try {
      dinamica = await this.leituraNoNavegador(url)
    } catch (erro) {
      if (erro instanceof ErroNavegadorIndisponivel) return { ...analise, aviso: erro.message }
      throw erro
    }
    if (!dinamica) return analise
    const comNavegador = await this.classificar(url, nomeFonte, dinamica)
    return comNavegador.tipo === 'LISTA' || analise.tipo !== 'LISTA' ? comNavegador : analise
  }

  /**
   * Leitura diária de uma fonte já verificada, pelo formato e endereço salvos (sem navegador).
   * Se não render chamadas, refaz a descoberta: devolve `redescoberta` para a fonte ser atualizada.
   */
  async ler(fonte: { nome: string; url: string; formato: FormatoDadosFonte | null; enderecoDados: string | null }): Promise<{
    chamadas: ChamadaEscolhida[]
    redescoberta?: AnaliseFonte
  }> {
    if (fonte.formato && fonte.enderecoDados) {
      try {
        const conteudo = texto(await this.baixarArquivo(fonte.enderecoDados))
        const leitura = this.leituraDoFormato(fonte.formato, fonte.enderecoDados, conteudo)
        if (leitura.candidatos.length) {
          const analise = await this.classificar(fonte.url, fonte.nome, leitura)
          if (analise.tipo === 'LISTA') return { chamadas: analise.chamadas }
        }
      } catch {
        // endereço de dados mudou ou saiu do ar: refaz a descoberta abaixo
      }
    }
    const redescoberta = await this.analisar(fonte.url, fonte.nome)
    if (redescoberta.tipo !== 'LISTA') {
      throw new Error(`A página da fonte deixou de listar editais: ${redescoberta.motivo || 'confira o endereço.'}`)
    }
    return { chamadas: redescoberta.chamadas, redescoberta }
  }

  /** "Tentar achar a fonte": a IA aponta páginas prováveis do mesmo site, e cada uma é verificada até achar uma lista. */
  async procurarListagem(url: string, nomeFonte = ''): Promise<ProcuraListagem> {
    const inicio = new URL(url).origin + '/'
    const links: LinkCandidato[] = []
    for (const endereco of url === inicio ? [url] : [url, inicio]) {
      try {
        const conteudo = texto(await this.baixarArquivo(endereco))
        let lidos = listarLinks(conteudo, endereco)
        if (lidos.length < 10 && montadaPorJavascript(conteudo)) {
          lidos = listarLinks((await this.abrirNoNavegador(endereco)).html, endereco)
        }
        links.push(...lidos)
      } catch {
        // página que não abre: segue com a outra
      }
    }
    const doSite = [...new Map(links.filter((l) => new URL(l.url).origin === new URL(url).origin).map((l) => [l.url, l])).values()]
    const tentativas: ProcuraListagem['tentativas'] = []
    if (!doSite.length) return { encontrada: null, tentativas }

    const resposta = await this.modelo.gerarJson(mensagensDeProcuraDaListagem(url, doSite.slice(0, 250)), { temperatura: 0 })
    for (const sugestao of interpretarProcuraDaListagem(resposta, doSite)) {
      try {
        const analise = await this.analisar(sugestao, nomeFonte)
        if (analise.tipo === 'LISTA') return { encontrada: analise, tentativas }
        tentativas.push({ url: sugestao, resultado: analise.tipo === 'EDITAL' ? 'é um edital específico' : analise.motivo || 'não lista editais' })
      } catch (erro) {
        tentativas.push({ url: sugestao, resultado: erro instanceof Error ? erro.message : 'não abriu' })
      }
    }
    return { encontrada: null, tentativas }
  }

  // ---- Leituras ----

  private async leituraEstatica(url: string, conteudo: string): Promise<Leitura> {
    if (pareceFeed(conteudo)) return this.leituraDoFormato('FEED', url, conteudo)
    const feed = feedDaPropriaPagina(feedsAnunciados(conteudo, url), url)
    if (feed) {
      try {
        const leitura = this.leituraDoFormato('FEED', feed, texto(await this.baixarArquivo(feed)))
        if (leitura.candidatos.length) return { ...leitura, ...resumoDaPagina(conteudo) }
      } catch {
        // feed anunciado que não abre: usa a página
      }
    }
    return this.leituraDoFormato('HTML', url, conteudo)
  }

  private leituraDoFormato(formato: FormatoDadosFonte, endereco: string, conteudo: string): Leitura {
    if (formato === 'JSON') {
      return { formato, enderecoDados: endereco, titulo: '', trecho: '(dados do site)', candidatos: candidatosDoJson(JSON.parse(conteudo), endereco) }
    }
    const candidatos = formato === 'FEED' ? linksDoFeed(conteudo, endereco) : listarLinks(conteudo, endereco)
    return { formato, enderecoDados: endereco, ...resumoDaPagina(conteudo), candidatos }
  }

  // Abre no navegador e fica com a resposta JSON que mais parece uma lista de chamadas.
  private async leituraNoNavegador(url: string): Promise<Leitura | null> {
    const { html, respostasJson } = await this.abrirNoNavegador(url)
    let melhor: Leitura | null = null
    for (const resposta of respostasJson) {
      const candidatos = candidatosDoJson(resposta.dados, url)
      if (candidatos.length >= 3 && candidatos.length > (melhor?.candidatos.length ?? 0)) {
        melhor = { formato: 'JSON', enderecoDados: resposta.url, ...resumoDaPagina(html), candidatos }
      }
    }
    return melhor
  }

  private async classificar(url: string, fonte: string, leitura: Leitura): Promise<AnaliseFonte> {
    const resposta = await this.modelo.gerarJson(
      mensagensDeLeituraDaPagina({ fonte: fonte || url, url, titulo: leitura.titulo, trecho: leitura.trecho, candidatos: leitura.candidatos }, hoje()),
      { temperatura: 0 },
    )
    const { tipo, motivo, chamadas } = interpretarLeituraDaPagina(resposta, leitura.candidatos)
    return { url, tipo, motivo, formato: leitura.formato, enderecoDados: leitura.enderecoDados, chamadas }
  }
}
