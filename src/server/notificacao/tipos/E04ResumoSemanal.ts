import { STATUS_EDITAL } from '../../../shared/rotulos.js'
import { Formato } from '../formato.js'
import { Links } from '../links.js'
import { Notificacao } from '../notificacao.js'

export type ResumoSemanalDados = {
  inicio: Date
  fim: Date
  numeros: {
    coletados: number
    elegiveis: number
    inelegiveis: number
    indeterminados: number
    aprovados: number
    inscritos: number
  }
  maioresOportunidades: { nota: number; titulo: string; orgao: string | null; prazo: string | null }[]
  prazosProximos: { dias: number; titulo: string; status: string }[]
  pendencias: { aguardandoVerificacao: number; aprovadosSemInscricao: number }
  fontes: { nome: string; ultimoStatus: string | null; ultimaColetaEm: string | null; itens: number | null }[]
}

// E04 — Resumo semanal. Marco = dia final do período, para não repetir na mesma semana.
export class ResumoSemanal extends Notificacao {
  readonly tipo = 'E04'
  readonly papeisPadrao = ['GESTOR'] as const

  constructor(private readonly dados: ResumoSemanalDados) {
    super(null, Formato.horaLocal(dados.fim).dia)
  }

  assunto(): string {
    const { inicio, fim } = this.dados
    return `${Notificacao.PREFIXO} Resumo da semana — ${Formato.data(inicio.toISOString())} a ${Formato.data(fim.toISOString())}`
  }

  protected conteudo(): string {
    const { numeros, maioresOportunidades, prazosProximos, pendencias, fontes } = this.dados
    return [
      'Panorama da semana.',
      '',
      'NÚMEROS',
      Formato.campos([
        ['Editais coletados', String(numeros.coletados)],
        ['Elegíveis', String(numeros.elegiveis)],
        ['Inelegíveis', String(numeros.inelegiveis)],
        ['Aguardando verificação', String(numeros.indeterminados)],
        ['Aprovados pela equipe', String(numeros.aprovados)],
        ['Inscrições registradas', String(numeros.inscritos)],
      ]),
      '',
      'MAIORES OPORTUNIDADES DA SEMANA',
      ...ResumoSemanal.ouNenhum(
        maioresOportunidades.map(
          (o) =>
            `  ${Formato.nota(o.nota)} · ${o.titulo} · ${o.orgao ?? 'órgão não localizado'} · encerra ${Formato.data(o.prazo)}`,
        ),
      ),
      '',
      'PRAZOS NOS PRÓXIMOS 15 DIAS',
      ...ResumoSemanal.ouNenhum(
        prazosProximos.map((p) => `  ${p.dias}d · ${p.titulo} · status ${STATUS_EDITAL[p.status] ?? p.status}`),
      ),
      '',
      'PENDÊNCIAS',
      `  ${pendencias.aguardandoVerificacao} editais aguardam verificação manual`,
      `  ${pendencias.aprovadosSemInscricao} aprovados ainda não inscritos`,
      '',
      'SAÚDE DA COLETA',
      ...ResumoSemanal.ouNenhum(
        fontes.map(
          (f) =>
            `  ${f.nome}: ${f.ultimoStatus ?? 'nunca executada'} · última coleta ${f.ultimaColetaEm ? Formato.dataHora(f.ultimaColetaEm) : '—'} · ${f.itens ?? 0} itens`,
        ),
      ),
      '',
      `Abrir painel: ${Links.dashboard()}`,
    ].join('\n')
  }

  private static ouNenhum(linhas: string[]): string[] {
    return linhas.length ? linhas : ['  (nenhum)']
  }
}
