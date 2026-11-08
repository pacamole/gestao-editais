import { ErroNaoEncontrado, ErroRegraNegocio } from '../dominio/erros.js'
import type { Edital } from '../dominio/entidades.js'
import type { ModeloLinguagemPorta } from '../portas/ModeloLinguagemPorta.js'
import type { Repositorios } from '../repositorios/index.js'
import type { AnaliseElegibilidade, RequisitoTriagem, StatusRequisitoTriagem } from '../../shared/tipos/triagem.js'
import { resumoDaElegibilidade } from '../../shared/rotulos.js'
import { lerPaginaPublica } from '../integracoes/pagina.js'
import { ehMarcadorDeTextoPdf } from '../integracoes/pdf.js'
import { lerSiteEmpresa } from '../integracoes/siteEmpresa.js'
import type { PaginaSiteEmpresa } from '../integracoes/siteEmpresa.js'
import { mensagensDeTriagem } from './ia/promptsTriagem.js'
import { caracteresDisponiveis, contextoParaExtracao } from './ia/contextoEdital.js'

type RepositoriosTriagem = Pick<Repositorios, 'edital' | 'perfilEmpresa' | 'triagemElegibilidade'>

const STATUS_REQUISITO = new Set<StatusRequisitoTriagem>(['ATENDE', 'NAO_ATENDE', 'INDETERMINADO'])
const TOKENS_RESPOSTA_TRIAGEM = 2_048
const RESERVA_TOKENS_INSTRUCOES = 700
const RESERVA_CARACTERES_PROMPT = 1_600

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

function normalizarEvidencia(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR').trim()
}

function requisitosDaResposta(
  dados: Record<string, unknown>,
  textoEdital: string,
  urlsSiteDisponiveis: Set<string>,
): RequisitoTriagem[] {
  if (!Array.isArray(dados.requisitos)) throw new Error('A IA não retornou uma lista de requisitos válida.')
  const textoNormalizado = normalizarEvidencia(textoEdital)
  return dados.requisitos.map((item): RequisitoTriagem => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('A IA retornou um requisito em formato inválido.')
    }
    const r = item as Record<string, unknown>
    const pergunta = texto(r.pergunta)
    const status = texto(r.status) as StatusRequisitoTriagem
    if (!pergunta || !STATUS_REQUISITO.has(status)) throw new Error('A IA retornou um requisito sem pergunta ou com status inválido.')
    const evidencia = texto(r.evidencia_edital)
    const evidenciaValida = evidencia.length >= 8 && textoNormalizado.includes(normalizarEvidencia(evidencia))
    const fontesSite = Array.isArray(r.fontes_site)
      ? [...new Set(r.fontes_site.filter((url): url is string => typeof url === 'string').map((url) => url.trim()).filter((url) => urlsSiteDisponiveis.has(url)))]
      : []
    return {
      pergunta,
      status: status === 'INDETERMINADO' || evidenciaValida ? status : 'INDETERMINADO',
      comparativo_perfil: texto(r.comparativo_perfil),
      comparativo_site: fontesSite.length ? texto(r.comparativo_site) : 'A IA não identificou evidência verificável do site para este requisito.',
      fontes_site: fontesSite,
      evidencia_edital: evidenciaValida ? evidencia : '',
    }
  })
}

function statusGeral(requisitos: RequisitoTriagem[]): AnaliseElegibilidade['status'] {
  if (requisitos.some((r) => r.status === 'NAO_ATENDE')) return 'INELEGIVEL'
  if (requisitos.some((r) => r.status === 'INDETERMINADO')) return 'INDETERMINADO'
  return 'ELEGIVEL'
}

function termosRelevantes(edital: string, perfil: object): Set<string> {
  const dadosPerfil = JSON.stringify(perfil)
  const textoBusca = `${edital} ${dadosPerfil}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const ignorar = new Set(['para', 'como', 'mais', 'menos', 'pela', 'pelo', 'entre', 'sobre', 'este', 'esta', 'sua', 'seus', 'suas', 'uma', 'que', 'com', 'dos', 'das', 'nos', 'nas', 'empresa'])
  return new Set((textoBusca.match(/[a-z0-9]{4,}/g) ?? []).filter((termo) => !ignorar.has(termo)).slice(0, 250))
}

function selecionarPaginasSite(
  paginas: PaginaSiteEmpresa[],
  termos: Set<string>,
  limiteCaracteres: number,
): { texto: string; quantidade: number; truncado: boolean } {
  const ranqueadas = paginas
    .map((pagina) => {
      const conteudo = `${pagina.url} ${pagina.texto}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      const palavrasPagina = new Set(conteudo.match(/[a-z0-9]{4,}/g) ?? [])
      let correspondencias = 0
      for (const termo of termos) if (palavrasPagina.has(termo)) correspondencias++
      return { pagina, pontuacao: pagina.prioridade * 5 + correspondencias }
    })
    .sort((a, b) => b.pontuacao - a.pontuacao)

  const selecionadas: string[] = []
  let restante = limiteCaracteres
  let truncado = ranqueadas.length > 0 && limiteCaracteres <= 0
  for (const { pagina } of ranqueadas) {
    if (restante <= 0) {
      truncado = true
      break
    }
    const bloco = `\n\n[Página: ${pagina.url}]\n${pagina.texto}`
    if (bloco.length <= restante) {
      selecionadas.push(bloco)
      restante -= bloco.length
      continue
    }
    selecionadas.push(bloco.slice(0, restante))
    restante = 0
    truncado = true
  }
  return { texto: selecionadas.join(''), quantidade: selecionadas.length, truncado }
}

export class TriagemElegibilidadeServico {
  constructor(
    private readonly repos: RepositoriosTriagem,
    private readonly modelo: ModeloLinguagemPorta,
    private readonly lerPagina: typeof lerPaginaPublica = lerPaginaPublica,
  ) {}

  async analisar(editalId: string): Promise<AnaliseElegibilidade> {
    let edital = this.repos.edital.buscarPorId(editalId)
    if (!edital) throw new ErroNaoEncontrado('Edital não encontrado.')
    const perfil = this.repos.perfilEmpresa.obter()
    if (!perfil) throw new ErroRegraNegocio('Cadastre o perfil da empresa antes de analisar a elegibilidade.')
    edital = await this.obterTextoEdital(edital)
    if (!edital.texto_extraido?.trim() || ehMarcadorDeTextoPdf(edital.texto_extraido)) {
      throw new ErroRegraNegocio('Este edital não possui texto legível para analisar.')
    }

    let site = perfil.site_url ? await lerSiteEmpresa(perfil.site_url, this.lerPagina) : null
    let avisoLeitura = site?.aviso ?? (perfil.site_url ? null : 'Nenhum site da empresa foi informado no perfil.')
    if (site && site.aviso) avisoLeitura = site.aviso
    const caracteres = caracteresDisponiveis(
      this.modelo.limiteDeContexto(),
      TOKENS_RESPOSTA_TRIAGEM + RESERVA_TOKENS_INSTRUCOES,
    )
    if (caracteres < 3_000) throw new ErroRegraNegocio('O modelo configurado não tem contexto suficiente para a triagem.')
    const espacoPrompt = RESERVA_CARACTERES_PROMPT + JSON.stringify(perfil).length
    const espacoDocumentos = Math.max(0, caracteres - espacoPrompt)
    const maximoEdital = site
      ? Math.min(edital.texto_extraido.length, Math.floor(espacoDocumentos * 0.45))
      : edital.texto_extraido.length
    const contextoEdital = contextoParaExtracao(edital.id, edital.texto_extraido, maximoEdital)
    const disponivelSite = Math.max(0, espacoDocumentos - contextoEdital.texto.length)
    const siteSelecionado = site
      ? selecionarPaginasSite(site.paginas, termosRelevantes(edital.texto_extraido, perfil), disponivelSite)
      : { texto: '', quantidade: 0, truncado: false }
    if (site && siteSelecionado.truncado) {
      avisoLeitura = [
        avisoLeitura,
        `A leitura percorreu ${site.paginasLidas} página(s), mas somente ${siteSelecionado.quantidade} foi/foram enviada(s) à IA por limite de contexto; as páginas mais relevantes foram priorizadas.`,
      ].filter(Boolean).join(' ')
    }
    const dados = await this.modelo.gerarJson(
      mensagensDeTriagem(contextoEdital.texto, perfil, siteSelecionado.texto, avisoLeitura),
      { maximoTokens: TOKENS_RESPOSTA_TRIAGEM },
    )
    const urlsSiteDisponiveis = new Set(
      siteSelecionado.texto.match(/\[Página: (https?:\/\/[^\]\r\n]+)\]/g)?.map((marcador) => marcador.slice(9, -1)) ?? [],
    )
    const requisitos = requisitosDaResposta(dados, edital.texto_extraido, urlsSiteDisponiveis)
    const status = requisitos.length ? statusGeral(requisitos) : 'INDETERMINADO'
    const analise: AnaliseElegibilidade = {
      status,
      resumo: resumoDaElegibilidade(status),
      requisitos,
      paginas_site_lidas: site?.paginasLidas ?? 0,
      paginas_site_enviadas: siteSelecionado.quantidade,
      aviso_leitura: avisoLeitura,
      criado_em: new Date().toISOString(),
    }
    this.repos.triagemElegibilidade.inserir(edital.id, analise, perfil.atualizado_em)
    return analise
  }

  private async obterTextoEdital(edital: Edital): Promise<Edital> {
    if (edital.texto_extraido?.trim() && !ehMarcadorDeTextoPdf(edital.texto_extraido)) return edital
    const url = edital.url_documento ?? edital.url_original
    if (!url) return edital
    const pagina = await this.lerPagina(url)
    const atualizado = this.repos.edital.atualizar(edital.id, { texto_extraido: pagina.texto })
    if (!atualizado) throw new ErroNaoEncontrado('O edital deixou de existir durante a leitura.')
    return atualizado
  }
}
