import { ELEGIBILIDADE } from '../../../shared/rotulos.js'
import type { Edital } from '../../entidades.js'
import { Formato, NAO_LOCALIZADO } from '../formato.js'
import { Links } from '../links.js'
import { Notificacao } from '../notificacao.js'

export type Mudanca = { campo: string; antes: string; agora: string }
export type Comparacao<T> = { antes: T; agora: T }

// E05 — Edital retificado. Marco = hash do novo documento (uma notificação por retificação).
export class EditalRetificado extends Notificacao {
  readonly tipo = 'E05'
  readonly papeisPadrao = ['ANALISTA', 'GESTOR'] as const

  constructor(
    private readonly edital: Edital,
    private readonly mudancas: Mudanca[],
    private readonly elegibilidade: Comparacao<string | null>,
    private readonly nota: Comparacao<number | null>,
    marco: string,
  ) {
    super(edital.id, marco)
  }

  assunto(): string {
    return `${Notificacao.PREFIXO} Edital retificado: ${Formato.tituloCurto(this.edital.titulo)}`
  }

  protected conteudo(): string {
    const e = this.edital
    const rotuloElegibilidade = (s: string | null) => (s ? (ELEGIBILIDADE[s] ?? s) : 'sem avaliação')
    return [
      'Um edital que já estava sob acompanhamento foi alterado na fonte original.',
      '',
      Formato.campos([
        ['Título', e.titulo],
        ['Órgão', e.orgao_financiador ?? NAO_LOCALIZADO],
      ]),
      '',
      'O QUE MUDOU',
      ...(this.mudancas.length
        ? this.mudancas.flatMap((m) => [`  ${m.campo}`, `    Antes: ${m.antes}`, `    Agora: ${m.agora}`])
        : ['  (nenhum campo extraído mudou)']),
      '',
      `  Elegibilidade: ${rotuloElegibilidade(this.elegibilidade.antes)} → ${rotuloElegibilidade(this.elegibilidade.agora)}`,
      `  Nota de fit:   ${Formato.nota(this.nota.antes)} → ${Formato.nota(this.nota.agora)}`,
      '',
      `Abrir edital: ${Links.edital(e.id)}`,
    ].join('\n')
  }
}
