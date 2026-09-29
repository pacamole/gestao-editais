import type { Fonte } from '../../entidades.js'
import { Formato } from '../formato.js'
import { Links } from '../links.js'
import { Notificacao } from '../notificacao.js'

// E06 — Falha na coleta. Marco = fonte + primeira execução da sequência de falhas,
// para avisar uma vez por sequência e não a cada nova falha.
export class FalhaColeta extends Notificacao {
  readonly tipo = 'E06'
  readonly papeisPadrao = ['GESTOR'] as const

  constructor(
    private readonly fonte: Fonte,
    private readonly falhasConsecutivas: number,
    primeiraFalhaId: string,
  ) {
    super(null, `${fonte.id}:${primeiraFalhaId}`)
  }

  assunto(): string {
    return `${Notificacao.PREFIXO} Falha na coleta: ${this.fonte.nome}`
  }

  protected conteudo(): string {
    const f = this.fonte
    return [
      `A coleta automática da fonte abaixo falhou nas ${this.falhasConsecutivas} últimas execuções.`,
      '',
      Formato.campos([
        ['Fonte', f.nome],
        ['URL', f.url_base ?? '—'],
        ['Última tentativa', f.ultima_coleta_em ? Formato.dataHora(f.ultima_coleta_em) : '—'],
        ['Erro', f.ultima_mensagem_erro ?? '—'],
      ]),
      '',
      'Enquanto a fonte estiver indisponível, editais deste portal podem ser',
      `adicionados manualmente em ${Links.novaEntrada()}.`,
      '',
      `Gerenciar fontes: ${Links.fontes()}`,
    ].join('\n')
  }
}
