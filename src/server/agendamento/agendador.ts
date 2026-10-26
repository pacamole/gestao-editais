import { horaLocal, type HoraLocal } from '../../shared/datas.js'

export type Tarefa = {
  nome: string
  // Consultado a cada minuto, no horário de Brasília. A tarefa roda no máximo 1× por dia.
  deveRodar(agora: HoraLocal): boolean
  executar(): Promise<unknown>
  recuperarAtrasada?: boolean
  // Tarefa periódica: roda de tempos em tempos, sem a regra de "uma vez por dia" e sem travar as demais.
  aCadaMinutos?: number
}

export type EstadoRotina = { ultimoDia?: string; cadastradaNoDia?: string; tentadaEm?: string; historico: { em: string; status: 'SUCESSO' | 'FALHA'; erro?: string }[] }
export type RegistroRotinas = { obter(nome: string): EstadoRotina; salvar(nome: string, estado: EstadoRotina): void }

// Agendador em processo: a cada minuto roda as tarefas cujo horário chegou e que ainda não rodaram hoje.
// Se o servidor estava hibernando no horário (RNF20), a tarefa roda assim que ele acordar no mesmo dia.
export class Agendador {
  private readonly ultimoDia = new Map<string, string>()
  private timer: NodeJS.Timeout | undefined
  private verificando = false
  private readonly periodicasEmExecucao = new Set<string>()
  private readonly ultimaPeriodica = new Map<string, number>()

  constructor(
    private readonly tarefas: Tarefa[],
    private readonly intervaloMs = 60_000,
    private readonly registro?: RegistroRotinas,
  ) {}

  iniciar(): void {
    if (this.timer) return
    this.timer = setInterval(() => this.verificarSemDerrubar(), this.intervaloMs)
    this.verificarSemDerrubar()
  }

  // Uma falha ao ler o estado (ex.: base na nuvem fora do ar) não pode derrubar o servidor:
  // registra e tenta de novo no próximo minuto.
  private verificarSemDerrubar(): void {
    this.verificar().catch((erro) => console.error('[agendador] verificação falhou; nova tentativa em 1 minuto.', erro))
  }

  // Tarefas periódicas rodam em segundo plano: uma longa (ex.: ler um edital com a IA) não atrasa as outras.
  private dispararPeriodica(tarefa: Tarefa, instante: Date): void {
    const ultima = this.ultimaPeriodica.get(tarefa.nome) ?? 0
    if (this.periodicasEmExecucao.has(tarefa.nome) || instante.getTime() - ultima < tarefa.aCadaMinutos! * 60_000) return
    this.ultimaPeriodica.set(tarefa.nome, instante.getTime())
    this.periodicasEmExecucao.add(tarefa.nome)
    tarefa
      .executar()
      .catch((erro) => console.error(`[agendador] ${tarefa.nome}: falhou`, erro))
      .finally(() => this.periodicasEmExecucao.delete(tarefa.nome))
  }

  parar(): void {
    clearInterval(this.timer)
    this.timer = undefined
  }

  async verificar(instante = new Date()): Promise<void> {
    if (this.verificando) return
    this.verificando = true
    try {
      const agora = horaLocal(instante)
      for (const tarefa of this.tarefas) {
        if (tarefa.aCadaMinutos) {
          this.dispararPeriodica(tarefa, instante)
          continue
        }
        const estado = this.registro?.obter(tarefa.nome) ?? { ultimoDia: this.ultimoDia.get(tarefa.nome), historico: [] }
        if (!estado.cadastradaNoDia) {
          estado.cadastradaNoDia = agora.dia
          this.registro?.salvar(tarefa.nome, estado)
        }
        const referencia = estado.ultimoDia ?? estado.cadastradaNoDia
        const atrasada = tarefa.recuperarAtrasada && referencia < agora.dia
        if (estado.ultimoDia === agora.dia || (!atrasada && !tarefa.deveRodar(agora))) continue
        // Falhas podem ser tentadas novamente após uma hora; não sobrepor execuções.
        if (estado.tentadaEm && instante.getTime() - Date.parse(estado.tentadaEm) < 3_600_000) continue
        estado.tentadaEm = instante.toISOString()
        this.registro?.salvar(tarefa.nome, estado)
        try {
          await tarefa.executar()
          estado.ultimoDia = agora.dia
          this.ultimoDia.set(tarefa.nome, agora.dia)
          estado.historico.push({ em: instante.toISOString(), status: 'SUCESSO' })
          console.log(`[agendador] ${tarefa.nome}: concluída`)
        } catch (erro) {
          estado.historico.push({ em: instante.toISOString(), status: 'FALHA', erro: String(erro) })
          console.error(`[agendador] ${tarefa.nome}: falhou`, erro)
        }
        estado.historico = estado.historico.slice(-30)
        this.registro?.salvar(tarefa.nome, estado)
      }
    } finally { this.verificando = false }
  }
}
