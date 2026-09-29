import { CLASSIFICACAO, MODALIDADES } from '../../../shared/rotulos.js'
import type { Avaliacao, Edital } from '../../entidades.js'
import { Formato, NAO_LOCALIZADO } from '../formato.js'
import { Links } from '../links.js'
import { Notificacao } from '../notificacao.js'

export type Destaque = { nome: string; contribuicao: number }

// E01 — Novo edital com fit alto
export class NovoEditalFitAlto extends Notificacao {
  readonly tipo = 'E01'
  readonly papeisPadrao = ['ANALISTA', 'GESTOR'] as const

  constructor(
    private readonly edital: Edital,
    private readonly avaliacao: Avaliacao,
    private readonly nota: number,
    // Os 3 critérios com maior contribuição para a nota.
    private readonly destaques: Destaque[],
  ) {
    super(edital.id)
  }

  assunto(): string {
    return `${Notificacao.PREFIXO} Nova oportunidade com fit ${Formato.numero(this.nota)}: ${Formato.tituloCurto(this.edital.titulo)}`
  }

  protected conteudo(): string {
    const e = this.edital
    const classificacao = this.avaliacao.classificacao ? CLASSIFICACAO[this.avaliacao.classificacao] : ''
    return [
      'Um novo edital compatível com o perfil da I9+ foi identificado.',
      '',
      Formato.campos([
        ['Título', e.titulo],
        ['Órgão', e.orgao_financiador ?? NAO_LOCALIZADO],
        ['Modalidade', e.modalidade ? MODALIDADES[e.modalidade] : NAO_LOCALIZADO],
        ['Valor por projeto', Formato.moeda(e.valor_maximo_por_projeto)],
        ['Prazo', Formato.prazoComDias(e.prazo_inscricao)],
        ['Nota de fit', `${Formato.nota(this.nota)} — ${classificacao}`],
      ]),
      '',
      'Por que este edital foi priorizado:',
      ...this.destaques.map((d) => `  • ${d.nome} (+${Formato.numero(d.contribuicao)} pontos)`),
      '',
      'Resumo:',
      e.resumo_executivo ?? NAO_LOCALIZADO,
      '',
      `Ver análise completa: ${Links.edital(e.id)}`,
      `Documento original:   ${e.url_documento ?? NAO_LOCALIZADO}`,
    ].join('\n')
  }

  protected rodapeExtra(): string[] {
    return [`Este é um e-mail automático. Ajuste seus alertas em ${Links.alertas()}.`]
  }
}
