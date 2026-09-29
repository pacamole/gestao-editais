import { CAMPOS_EDITAL, STATUS_EDITAL, type NomeCampoEdital } from '../../../shared/rotulos.js'
import type { CriterioIndeterminado, Edital } from '../../entidades.js'
import { Formato, NAO_LOCALIZADO } from '../formato.js'
import { Links } from '../links.js'
import { Notificacao } from '../notificacao.js'

// E02 — Alerta de prazo se aproximando. Marco = dias restantes ("15d", "7d", "2d").
export class PrazoProximo extends Notificacao {
  readonly tipo = 'E02'
  readonly papeisPadrao = ['ANALISTA', 'GESTOR'] as const

  constructor(
    private readonly edital: Edital,
    private readonly diasRestantes: number,
    private readonly nota: number | null,
    private readonly indeterminados: CriterioIndeterminado[],
  ) {
    super(edital.id, `${diasRestantes}d`)
  }

  assunto(): string {
    return `${Notificacao.PREFIXO} Faltam ${this.diasRestantes} dias: ${Formato.tituloCurto(this.edital.titulo)}`
  }

  protected conteudo(): string {
    const e = this.edital
    const linhas = [
      'Atenção ao prazo de um edital ainda sem inscrição registrada.',
      '',
      Formato.campos([
        ['Título', e.titulo],
        ['Órgão', e.orgao_financiador ?? NAO_LOCALIZADO],
        ['Encerra em', Formato.dataHora(e.prazo_inscricao)],
        ['Restam', `${this.diasRestantes} dias`],
        ['Status atual', STATUS_EDITAL[e.status] ?? e.status],
        ['Nota de fit', Formato.nota(this.nota)],
      ]),
    ]

    if (e.status === 'APROVADO') {
      linhas.push('', 'Este edital foi aprovado pela equipe mas ainda não consta como inscrito.')
    }
    if (e.status === 'EM_REVISAO' && this.indeterminados.length) {
      linhas.push(
        '',
        'Este edital tem pendências de verificação manual que seguem em aberto:',
        ...this.indeterminados.map((c) => {
          const campo = CAMPOS_EDITAL[c.campo_faltante as NomeCampoEdital]?.rotulo ?? c.campo_faltante
          return `  • ${c.nome} (${campo})`
        }),
      )
    }

    linhas.push('', `Abrir edital: ${Links.edital(e.id)}`)
    return linhas.join('\n')
  }
}
