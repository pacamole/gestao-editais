import { CAMPOS_EDITAL, type NomeCampoEdital } from '../../../shared/rotulos.js'
import type { CriterioIndeterminado, Edital } from '../../entidades.js'
import { Formato, NAO_LOCALIZADO } from '../formato.js'
import { Links } from '../links.js'
import { Notificacao } from '../notificacao.js'

// E03 — Edital requer verificação humana
export class VerificacaoNecessaria extends Notificacao {
  readonly tipo = 'E03'
  readonly papeisPadrao = ['ANALISTA'] as const

  constructor(
    private readonly edital: Edital,
    private readonly indeterminados: CriterioIndeterminado[],
  ) {
    super(edital.id)
  }

  assunto(): string {
    return `${Notificacao.PREFIXO} Verificação necessária: ${Formato.tituloCurto(this.edital.titulo)}`
  }

  protected conteudo(): string {
    const e = this.edital
    return [
      'Um edital foi analisado, mas o sistema não conseguiu localizar no documento',
      'as informações abaixo. Como são critérios eliminatórios, a elegibilidade',
      'não pôde ser confirmada automaticamente.',
      '',
      Formato.campos([
        ['Título', e.titulo],
        ['Órgão', e.orgao_financiador ?? NAO_LOCALIZADO],
        ['Prazo', Formato.prazoComDias(e.prazo_inscricao)],
      ]),
      '',
      'Pontos a verificar manualmente:',
      ...this.indeterminados.flatMap((c) => {
        const campo = CAMPOS_EDITAL[c.campo_faltante as NomeCampoEdital]
        return [
          `  • ${c.nome}`,
          `    Informação não localizada: ${campo?.rotulo ?? c.campo_faltante}`,
          `    Sugestão de busca no documento: "${campo?.termoBusca ?? c.campo_faltante}"`,
        ]
      }),
      '',
      'Demais campos extraídos com sucesso:',
      this.camposPreenchidos(),
      '',
      `Abrir para revisão: ${Links.edital(e.id)}`,
      `Documento original:  ${e.url_documento ?? NAO_LOCALIZADO}`,
    ].join('\n')
  }

  private camposPreenchidos(): string {
    const pares = (Object.keys(CAMPOS_EDITAL) as NomeCampoEdital[])
      .filter((campo) => campo !== 'titulo' && this.edital[campo] !== null)
      .map((campo): [string, string] => [CAMPOS_EDITAL[campo].rotulo, Formato.valorCampo(campo, this.edital[campo])])
    return pares.length ? Formato.campos(pares) : '  (nenhum)'
  }
}
