import type { DashboardRepositorio } from '../repositorios/DashboardRepositorio.js'
import { diasAte, hoje, somarDias } from '../../shared/datas.js'
import type { DashboardResposta, EditalUrgente, SaudeFonte, StatusSaudeColeta } from '../../shared/tipos/dashboard.js'
import type { StatusColeta, TipoFonte } from '../../shared/tipos/dominio.js'

const DIA_MS = 86_400_000
const JANELA_DIAS = 7
const QUANTIDADE_LISTAS = 5

// Números do painel inicial.
export class DashboardServico {
  constructor(private readonly consultas: DashboardRepositorio) {}

  painel(instante = new Date()): DashboardResposta {
    const dia = hoje(instante)
    const cartoes = this.consultas.contagens(
      new Date(instante.getTime() - JANELA_DIAS * DIA_MS).toISOString(),
      dia,
      somarDias(dia, JANELA_DIAS),
    )

    const editaisUrgentes: EditalUrgente[] = this.consultas.maisUrgentes(QUANTIDADE_LISTAS).map((e) => {
      const restantes = diasAte(e.prazo_inscricao!, instante)
      return { ...e, dias_restantes: restantes, urgente: restantes >= 0 && restantes <= JANELA_DIAS }
    })

    const saudeColeta: SaudeFonte[] = this.consultas.fontesComUltimaExecucao().map((f) => ({
      fonte_id: f.fonte_id,
      nome: f.nome,
      tipo: f.tipo as TipoFonte,
      ativo: f.ativo,
      ultima_coleta_em: f.ultima_coleta_em ?? f.ultima_execucao?.finalizada_em ?? null,
      status: (f.ultimo_status ?? f.ultima_execucao?.status ?? (f.ativo ? 'PENDENTE' : 'INATIVO')) as StatusColeta | StatusSaudeColeta,
      mensagem_erro: f.ultima_mensagem_erro ?? f.ultima_execucao?.mensagem_erro ?? null,
      itens_coletados: f.ultima_execucao?.itens_coletados ?? 0,
    }))

    return {
      cartoes,
      editaisUrgentes,
      topFit: this.consultas.maioresNotas(QUANTIDADE_LISTAS),
      distribuicao: this.consultas.distribuicaoPorFit() ?? { alto: 0, medio: 0, baixo: 0, total: 0 },
      saudeColeta,
      totalEditais: this.consultas.totalEditais(),
    }
  }
}
