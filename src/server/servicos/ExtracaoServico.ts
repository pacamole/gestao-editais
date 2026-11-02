import { hoje, prazoVencido } from '../../shared/datas.js'
import { lerPaginaPublica } from '../integracoes/pagina.js'
import { ehMarcadorDeTextoPdf } from '../integracoes/pdf.js'
import { novoId, transacao } from '../db/index.js'
import type { Edital } from '../dominio/entidades.js'
import { semPaginasLidas } from '../dominio/textoEdital.js'
import { evidenciaProtegida } from '../../shared/camposEditaveis.js'
import { ErroNaoEncontrado, ErroRegraNegocio, ErroServicoExterno } from '../dominio/erros.js'
import { ErroModeloLinguagem, type ModeloLinguagemPorta } from '../portas/ModeloLinguagemPorta.js'
import type { Repositorios } from '../repositorios/index.js'
import type { ExtracaoResposta } from '../../shared/tipos/edital.js'
import { caracteresDisponiveis, contextoParaExtracao } from './ia/contextoEdital.js'
import {
  interpretarExtracao,
  type CampoEditalExtraido,
  type ResultadoExtracaoEdital,
  type ValorCampoEditalExtraido,
} from './ia/interpretarExtracao.js'
import { mensagensDeExtracao } from './ia/promptsExtracao.js'

type RepositoriosExtracao = Pick<Repositorios, 'edital' | 'evidencia'>

// Um JSON com todos os campos e suas evidências passa de 2.048 tokens quando o edital é rico.
const TOKENS_RESPOSTA = 3_072
// O pedido além do edital: as instruções e a lista de campos.
const RESERVA_TOKENS = TOKENS_RESPOSTA + 1_000

// Prazo encontrado que já passou: o edital fica como está até a expiração diária, então o usuário é avisado.
function avisoDePrazo(edital: Edital, campos: CampoEditalExtraido[]): string {
  if (!campos.includes('prazo_inscricao') || !prazoVencido(edital.prazo_inscricao)) return ''
  const [ano, mes, dia] = edital.prazo_inscricao!.split('-')
  return ` O prazo de inscrição encontrado (${dia}/${mes}/${ano}) já passou: o edital será marcado como expirado na próxima verificação.`
}

// Lê o documento do edital com o modelo de linguagem e preenche os campos que ainda estão vazios.
export class ExtracaoServico {
  constructor(
    private readonly repos: RepositoriosExtracao,
    private readonly modelo: ModeloLinguagemPorta,
    private readonly lerPagina: typeof lerPaginaPublica = lerPaginaPublica,
  ) {}

  /**
   * Lê o texto do edital com a IA e preenche os campos. Só os campos vazios, a menos que `refazCamposDaIa`
   * (retificação): aí também refaz os que a própria IA preencheu antes, nunca os editados à mão.
   */
  async extrairDados(editalId: string, opcoes: { refazCamposDaIa?: boolean } = {}): Promise<ExtracaoResposta> {
    const edital = this.buscar(editalId)
    if (!edital.texto_extraido?.trim() || ehMarcadorDeTextoPdf(edital.texto_extraido)) {
      throw new ErroRegraNegocio(
        'Este edital não possui texto extraído. Envie um PDF com texto selecionável antes de extrair os dados.',
      )
    }

    const extracao = await this.extrairCampos(edital.id, edital.texto_extraido)
    const campos = this.salvarCampos(edital, extracao, opcoes.refazCamposDaIa)
    const atualizado = this.repos.edital.buscarPorId(edital.id)!
    return {
      edital: atualizado,
      atualizados: campos.length,
      campos,
      mensagem: campos.length
        ? `${campos.length} campo(s) preenchido(s) com evidência do documento.${avisoDePrazo(atualizado, campos)}`
        : 'Não foram encontrados novos campos com evidência verificável. Os dados existentes foram preservados.',
    }
  }

  async lerUrl(editalId: string): Promise<ExtracaoResposta> {
    const edital = this.buscar(editalId)
    // O documento do edital vem primeiro: a página de origem pode ser só a lista do órgão (ex.: FINEP), que não
    // descreve o edital. A página só é lida quando não há documento (link colado de uma página de chamada).
    const url = edital.url_documento ?? edital.url_original
    if (!url) throw new ErroRegraNegocio('Este edital não tem uma URL cadastrada para leitura.')

    let pagina
    try {
      pagina = await this.lerPagina(url)
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : 'Não foi possível ler o conteúdo da URL.'
      // Servidor fora do ar ou rede caindo passa sozinho (vale tentar de novo); página inexistente ou sem texto, não.
      const passageira = /HTTP 5\d\d|fetch failed|timeout|aborted|ECONN|ENOTFOUND|EAI_AGAIN/i.test(mensagem)
      throw passageira ? new ErroServicoExterno(mensagem) : new ErroRegraNegocio(mensagem)
    }

    const textoAnterior = edital.texto_extraido?.trim() ? semPaginasLidas(edital.texto_extraido) : ''
    const textoExtraido = textoAnterior ? `${textoAnterior}\n\n${pagina.texto}` : pagina.texto
    const titulo =
      pagina.titulo && /^Chamada Pública identificada em /i.test(edital.titulo) ? pagina.titulo : edital.titulo
    const comPagina = this.repos.edital.atualizar(edital.id, {
      texto_extraido: textoExtraido,
      titulo,
      erro_processamento: null,
    })
    if (!comPagina) throw new ErroNaoEncontrado('O edital deixou de existir durante a leitura da página.')

    let campos: CampoEditalExtraido[]
    try {
      campos = this.salvarCampos(comPagina, await this.extrairCampos(edital.id, textoExtraido))
    } catch (erro) {
      console.error('A página foi lida, mas a extração estruturada falhou:', erro)
      const detalhe = erro instanceof ErroModeloLinguagem ? erro.message : 'Não foi possível extrair os campos com IA.'
      throw new ErroServicoExterno(`O conteúdo da página foi salvo para o chat, mas a extração de campos falhou: ${detalhe}`, {
        textoSalvo: true,
      })
    }

    const atualizado = this.repos.edital.buscarPorId(edital.id)!
    return {
      edital: atualizado,
      atualizados: campos.length,
      campos,
      mensagem: `Página lida e conteúdo adicionado ao contexto do chat. ${campos.length} campo(s) preenchido(s) com evidência verificável.${avisoDePrazo(atualizado, campos)}`,
    }
  }

  /** Pede ao modelo os campos do edital: o documento inteiro, ou os trechos de cada campo se não couber. */
  async extrairCampos(editalId: string, textoEdital: string): Promise<ResultadoExtracaoEdital> {
    const contexto = contextoParaExtracao(
      editalId,
      textoEdital,
      caracteresDisponiveis(this.modelo.limiteDeContexto(), RESERVA_TOKENS),
    )
    if (!contexto.texto.trim()) {
      throw new ErroModeloLinguagem('Não encontrei trechos suficientes no texto para extrair os dados. Verifique se o PDF tem texto legível.', 422)
    }

    const dados = await this.modelo.gerarJson(mensagensDeExtracao(contexto, hoje()), { maximoTokens: TOKENS_RESPOSTA })
    return interpretarExtracao(dados, textoEdital)
  }

  // Grava só os campos ainda vazios, com a evidência literal do documento.
  private salvarCampos(edital: Edital, extracao: ResultadoExtracaoEdital, refazCamposDaIa = false): CampoEditalExtraido[] {
    const alteracoes: Partial<Edital> = {}
    const atualizados: CampoEditalExtraido[] = []
    // Campo com evidência literal veio da IA; com marcador, foi o usuário ou a própria fonte (esses a IA não refaz).
    const daIa = new Set(
      refazCamposDaIa
        ? this.repos.evidencia.listarDoEdital(edital.id).filter((ev) => !evidenciaProtegida(ev.trecho_literal)).map((ev) => ev.campo)
        : [],
    )
    for (const [campo, valor] of Object.entries(extracao.campos) as [CampoEditalExtraido, ValorCampoEditalExtraido][]) {
      const valorAtual = edital[campo]
      const preenchido = valorAtual != null && valorAtual !== ''
      if (valor == null || (preenchido && !daIa.has(campo))) continue
      Object.assign(alteracoes, { [campo]: valor })
      atualizados.push(campo)
    }

    if (atualizados.length) {
      transacao(() => {
        this.repos.edital.atualizar(edital.id, alteracoes)
        for (const campo of atualizados) {
          const evidencia = extracao.evidencias[campo]
          if (!evidencia) continue
          this.repos.evidencia.excluirDoCampo(edital.id, campo)
          this.repos.evidencia.inserir({
            id: novoId(),
            edital_id: edital.id,
            campo,
            trecho_literal: evidencia.trecho,
            pagina: evidencia.pagina,
            confianca: 'MEDIA',
          })
        }
      })
    }
    return atualizados
  }

  private buscar(editalId: string): Edital {
    const edital = this.repos.edital.buscarPorId(editalId)
    if (!edital) throw new ErroNaoEncontrado('Edital não encontrado.')
    return edital
  }
}
