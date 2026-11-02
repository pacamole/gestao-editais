import type { ColetaServico } from './ColetaServico.js'
import { explicarFalhaColeta } from './coleta/explicarFalha.js'
import { ehFonteInterna, FONTES_ENTRADA_MANUAL } from './coleta/fontesPadrao.js'
import type { IntegracaoFonte } from './coleta/integracoes/index.js'
import { urlHttpValida } from './ConfigSistemaServico.js'
import type { AnaliseFonte, DescobertaFonteServico } from './DescobertaFonteServico.js'
import { agora, transacao } from '../db/index.js'
import type { Fonte, IntegracaoFonte as CodigoIntegracao } from '../dominio/entidades.js'
import { ErroLimiteExcedido, ErroNaoEncontrado, ErroRegraNegocio, ErroServicoExterno, ErroValidacao } from '../dominio/erros.js'
import type { Repositorios } from '../repositorios/index.js'
import { rotuloDaFonte } from '../../shared/rotulos.js'
import type {
  ExcluirFonteResposta,
  FonteResposta,
  ListaFontesResposta,
  OrigensResposta,
  ProcuraListagemResposta,
  VerificacaoFonte,
  VerificacaoFonteResposta,
} from '../../shared/tipos/fontes.js'

type RepositoriosFonte = Pick<Repositorios, 'fonte' | 'coletaExecucao'>

const FREQUENCIA_PADRAO = '0 6 * * *'
const EXECUCOES_NA_LISTA = 10
// Cada fonte custa uma chamada de IA por dia, mais a leitura de cada edital novo que ela trouxer.
export const LIMITE_FONTES_MONITORADAS = 20
// Quanto tempo a verificação de um endereço vale para liberar o "Adicionar fonte".
const VALIDADE_VERIFICACAO_MS = 15 * 60_000

const opcional = (valor: unknown): string | null => (valor == null || valor === '' ? null : String(valor))

// "06:30" → "30 6 * * *" (o agendador entende cron diário); sem hora informada, mantém a atual.
function cronDaHora(hora: unknown, atual: string): string {
  if (hora == null || hora === '') return atual
  const partes = /^(\d{1,2}):(\d{2})$/.exec(String(hora).trim())
  if (!partes || Number(partes[1]) > 23 || Number(partes[2]) > 59) throw new ErroValidacao('Horário inválido. Use HH:MM, como 06:00.')
  return `${Number(partes[2])} ${Number(partes[1])} * * *`
}

// Mesmo endereço escrito de jeitos diferentes ("https://Site.gov.br/x/" e "https://site.gov.br/x#topo").
function enderecoComparavel(url: string): string {
  const endereco = new URL(url)
  endereco.hash = ''
  endereco.hostname = endereco.hostname.toLowerCase().replace(/^www\./, '')
  return `${endereco.hostname}${endereco.pathname.replace(/\/+$/, '')}${endereco.search}`
}

const paraTela = (analise: AnaliseFonte): VerificacaoFonte => ({
  url: analise.url,
  tipo: analise.tipo,
  motivo: analise.motivo,
  formato: analise.formato,
  encontradas: analise.chamadas.map(({ titulo, url, numero }) => ({ titulo, url, numero })),
  aviso: analise.aviso ?? null,
})

/**
 * Fontes monitoradas, em duas origens:
 * - integradas: órgãos com dados estruturados (FINEP, Embrapii), criadas pelo sistema; só se pausam ou mudam de horário;
 * - adicionadas pelo usuário: qualquer página de editais, verificada antes de entrar (a IA confirma que é uma lista).
 * As fontes internas (upload, link e cadastro manual) só registram a origem do edital e não se editam por aqui.
 */
export class FonteServico {
  private readonly verificacoes = new Map<string, { analise: AnaliseFonte; em: number }>()

  constructor(
    private readonly repos: RepositoriosFonte,
    private readonly coleta: Pick<ColetaServico, 'coletar'>,
    private readonly descoberta: Pick<DescobertaFonteServico, 'analisar' | 'procurarListagem'>,
    private readonly integracoes: Record<CodigoIntegracao, IntegracaoFonte>,
    /** null se a IA responde; senão, o motivo (a escolha das chamadas depende dela). */
    private readonly problemaDaIa: () => Promise<string | null> = async () => null,
    private readonly agoraMs: () => number = () => Date.now(),
  ) {}

  /**
   * Seed das fontes: as internas (sempre ativas) e as integradas que faltarem. Uma integrada que o usuário
   * pausou continua pausada; uma que ele não tem é criada ativa.
   */
  garantirFontesPadrao(): void {
    for (const { nome, tipo } of FONTES_ENTRADA_MANUAL) {
      const existente = this.repos.fonte.buscarPorNome(nome)
      if (!existente) this.repos.fonte.inserir({ nome, tipo, ativo: true })
      else if (!existente.ativo) this.repos.fonte.atualizar(existente.id, { ativo: true })
    }
    for (const integracao of Object.values(this.integracoes)) {
      if (this.repos.fonte.buscarPorIntegracao(integracao.codigo)) continue
      this.repos.fonte.inserir({
        nome: integracao.nome,
        url_base: integracao.endereco,
        tipo: 'SCRAPER',
        integracao: integracao.codigo,
        frequencia_cron: FREQUENCIA_PADRAO,
        ativo: true,
      })
    }
  }

  listar(): ListaFontesResposta {
    const comExecucoes = (fonte: Fonte) => ({
      ...fonte,
      execucoes: this.repos.coletaExecucao.ultimasDaFonte(fonte.id, EXECUCOES_NA_LISTA),
    })
    const monitoradas = this.repos.fonte.listarMonitoradas()
    return {
      integradas: monitoradas.filter((f) => f.integracao).map(comExecucoes),
      adicionadas: monitoradas.filter((f) => !f.integracao).map(comExecucoes),
      limite: LIMITE_FONTES_MONITORADAS,
    }
  }

  /** De onde vieram os editais existentes, com nomes legíveis (filtro da lista de editais). */
  origens(): OrigensResposta {
    return { origens: this.repos.fonte.listarComEditais().map((f) => ({ id: f.id, nome: rotuloDaFonte(f) })) }
  }

  /**
   * Cadastra ou edita uma fonte. Adicionada pelo usuário: nome, endereço (verificado antes como lista de editais),
   * horário e ativa. Integrada: só o horário e se está ativa.
   */
  async salvar(dados: Record<string, unknown>): Promise<FonteResposta> {
    const existente = dados.id ? this.buscarMonitorada(String(dados.id)) : undefined
    if (existente?.integracao) return this.salvarIntegrada(existente, dados)

    const nome = String(dados.nome ?? '').trim()
    if (!nome) throw new ErroValidacao('Informe o nome da fonte.')
    const url = opcional(dados.url_base)?.trim() ?? null
    if (!url) throw new ErroValidacao('Informe o endereço da página de editais da fonte.')
    if (!urlHttpValida(url)) throw new ErroValidacao('Endereço inválido: use um link começando com http:// ou https://.')

    const outras = this.repos.fonte.listarMonitoradas().filter((f) => f.id !== existente?.id)
    const repetida = outras.find((f) => f.url_base && enderecoComparavel(f.url_base) === enderecoComparavel(url))
    if (repetida) throw new ErroValidacao(`Este endereço já é monitorado pela fonte "${repetida.nome}".`)
    if (outras.some((f) => f.nome.toLowerCase() === nome.toLowerCase())) throw new ErroValidacao(`Já existe uma fonte chamada "${nome}".`)
    if (!existente && outras.filter((f) => !f.integracao).length >= LIMITE_FONTES_MONITORADAS) {
      throw new ErroLimiteExcedido(`Limite de ${LIMITE_FONTES_MONITORADAS} fontes adicionadas atingido. Exclua uma antes de adicionar outra.`)
    }

    // Endereço novo só entra verificado como lista de editais (a verificação também diz como ler a página).
    let leitura: Pick<Fonte, 'formato_dados' | 'endereco_dados'> = {
      formato_dados: existente?.formato_dados ?? null,
      endereco_dados: existente?.endereco_dados ?? null,
    }
    if (!existente || existente.url_base !== url) {
      const analise = this.verificacaoValida(url)
      if (!analise) throw new ErroRegraNegocio('Verifique a página antes de adicionar a fonte.')
      if (analise.tipo !== 'LISTA') throw new ErroRegraNegocio('Este endereço não é uma lista de editais. Use "Tentar achar a fonte dos editais".')
      leitura = { formato_dados: analise.formato, endereco_dados: analise.enderecoDados }
    }

    const registro = {
      nome,
      url_base: url,
      tipo: 'SCRAPER' as const,
      frequencia_cron: cronDaHora(dados.hora, existente?.frequencia_cron ?? FREQUENCIA_PADRAO),
      ativo: dados.ativo !== false,
      ...leitura,
    }
    const salva = existente ? this.repos.fonte.atualizar(existente.id, registro) : this.repos.fonte.inserir(registro)
    return { ok: true, fonte: salva! }
  }

  /** Verifica um endereço: o que ele é (lista, edital, outra coisa), como ler e quais chamadas abertas tem. Não grava nada. */
  async verificar(dados: Record<string, unknown>): Promise<VerificacaoFonteResposta> {
    const url = this.urlInformada(dados)
    await this.exigirIa()
    try {
      const analise = await this.descoberta.analisar(url, String(dados.nome ?? '').trim())
      this.lembrar(analise)
      return { ok: true, verificacao: paraTela(analise) }
    } catch (erro) {
      throw new ErroServicoExterno(explicarFalhaColeta(erro))
    }
  }

  /** "Tentar achar a fonte dos editais neste link": a IA procura a página de editais do mesmo site. */
  async procurarListagem(dados: Record<string, unknown>): Promise<ProcuraListagemResposta> {
    const url = this.urlInformada(dados)
    await this.exigirIa()
    try {
      const { encontrada, tentativas } = await this.descoberta.procurarListagem(url, String(dados.nome ?? '').trim())
      if (encontrada) this.lembrar(encontrada)
      return { ok: true, encontrada: encontrada ? paraTela(encontrada) : null, tentativas }
    } catch (erro) {
      throw new ErroServicoExterno(explicarFalhaColeta(erro))
    }
  }

  alternarAtivo(id: string): FonteResposta {
    const fonte = this.buscarMonitorada(id)
    return { ok: true, fonte: this.repos.fonte.atualizar(fonte.id, { ativo: !fonte.ativo })! }
  }

  /**
   * Exclui uma fonte adicionada pelo usuário. Sem editais, some de vez (com o histórico de buscas). Com editais,
   * sai das listas e para de ser visitada, mas continua registrada para os editais seguirem mostrando de onde vieram.
   */
  excluir(id: string): ExcluirFonteResposta {
    const fonte = this.buscarMonitorada(id)
    if (fonte.integracao) throw new ErroRegraNegocio('Fonte integrada: ela não pode ser excluída, só pausada.')
    const editais = this.repos.fonte.contarEditais(fonte.id)
    transacao(() => {
      if (editais) this.repos.fonte.atualizar(fonte.id, { ativo: false, removida_em: agora() })
      else this.repos.fonte.excluir(fonte.id)
    })
    return {
      ok: true,
      mensagem: editais
        ? `Fonte "${fonte.nome}" excluída. ${editais === 1 ? 'O edital que ela trouxe continua' : `Os ${editais} editais que ela trouxe continuam`} na lista.`
        : `Fonte "${fonte.nome}" excluída.`,
    }
  }

  async coletar(id: string): Promise<FonteResposta> {
    const fonte = this.buscarMonitorada(id)
    try {
      await this.coleta.coletar(fonte)
    } catch (erro) {
      throw new ErroServicoExterno(erro instanceof Error && erro.message ? erro.message : 'A busca falhou.')
    }
    return { ok: true, fonte: this.repos.fonte.buscarPorId(fonte.id)! }
  }

  // ---- Internos ----

  private salvarIntegrada(fonte: Fonte, dados: Record<string, unknown>): FonteResposta {
    const nome = opcional(dados.nome)?.trim()
    const url = opcional(dados.url_base)?.trim()
    if ((nome && nome !== fonte.nome) || (url && url !== fonte.url_base)) {
      throw new ErroRegraNegocio('Fonte integrada: o nome e o endereço são definidos pelo sistema. Dá para mudar só o horário e pausar.')
    }
    const alteracoes = {
      frequencia_cron: cronDaHora(dados.hora, fonte.frequencia_cron ?? FREQUENCIA_PADRAO),
      ...(typeof dados.ativo === 'boolean' ? { ativo: dados.ativo } : {}),
    }
    return { ok: true, fonte: this.repos.fonte.atualizar(fonte.id, alteracoes)! }
  }

  private urlInformada(dados: Record<string, unknown>): string {
    const url = opcional(dados.url_base)?.trim()
    if (!url || !urlHttpValida(url)) throw new ErroValidacao('Informe um endereço começando com http:// ou https://.')
    return url
  }

  private lembrar(analise: AnaliseFonte): void {
    this.verificacoes.set(enderecoComparavel(analise.url), { analise, em: this.agoraMs() })
  }

  private verificacaoValida(url: string): AnaliseFonte | undefined {
    const guardada = this.verificacoes.get(enderecoComparavel(url))
    return guardada && this.agoraMs() - guardada.em < VALIDADE_VERIFICACAO_MS ? guardada.analise : undefined
  }

  private async exigirIa(): Promise<void> {
    const problema = await this.problemaDaIa()
    if (problema) throw new ErroRegraNegocio(`As fontes dependem da IA para achar as chamadas, e ela não está disponível: ${problema}`)
  }

  private buscarMonitorada(id: string): Fonte {
    const fonte = this.repos.fonte.buscarPorId(id)
    if (!fonte || fonte.removida_em) throw new ErroNaoEncontrado('Fonte não encontrada.')
    if (ehFonteInterna(fonte)) {
      throw new ErroRegraNegocio('Esta origem é interna (upload, link ou cadastro manual) e não pode ser alterada.')
    }
    return fonte
  }
}
