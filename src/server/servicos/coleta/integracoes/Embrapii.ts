import { baixar } from '../../../integracoes/http.js'
import type { ModeloLinguagemPorta } from '../../../portas/ModeloLinguagemPorta.js'
import { hoje } from '../../../../shared/datas.js'
import { interpretarLeituraDaPagina, mensagensDeLeituraDaPagina } from '../../ia/promptsColeta.js'
import { linksDoFeed } from '../leitorFonte.js'
import type { ChamadaColetada, IntegracaoFonte } from './IntegracaoFonte.js'

const PAGINA_DE_CHAMADAS = 'https://embrapii.org.br/chamadas-publicas/'
const FEED = 'https://embrapii.org.br/chamadas-publicas/feed/'

/**
 * Embrapii: feed RSS das chamadas públicas (WordPress). O feed traz abertas e encerradas sem dizer qual é qual,
 * então a IA escolhe as abertas pelo título; o PDF vem da página de cada chamada.
 */
export class Embrapii implements IntegracaoFonte {
  readonly codigo = 'EMBRAPII' as const
  readonly nome = 'Embrapii'
  readonly endereco = PAGINA_DE_CHAMADAS

  constructor(
    private readonly modelo: ModeloLinguagemPorta,
    private readonly baixarArquivo = baixar,
  ) {}

  async listarChamadas(): Promise<ChamadaColetada[]> {
    const itens = linksDoFeed(Buffer.from(await this.baixarArquivo(FEED)).toString('utf8'), FEED)
    if (!itens.length) throw new Error('O feed de chamadas da Embrapii veio vazio.')

    const resposta = await this.modelo.gerarJson(
      mensagensDeLeituraDaPagina(
        { fonte: this.nome, url: FEED, titulo: 'Chamadas Públicas – Embrapii', trecho: '(feed RSS das chamadas públicas)', candidatos: itens },
        hoje(),
      ),
      { temperatura: 0 },
    )
    // O feed é sempre a lista de chamadas: só interessa quais itens a IA considerou abertos.
    const { chamadas } = interpretarLeituraDaPagina({ ...resposta, tipo: 'LISTA' }, itens)
    return chamadas.map((c) => ({ idExterno: c.url, titulo: c.titulo, urlOriginal: c.url, urlDocumento: null, numero: c.numero }))
  }
}
