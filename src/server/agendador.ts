import { Formato, type HoraLocal } from './notificacao/formato.js'

export type Tarefa = {
  nome: string
  // Consultado a cada minuto, no horário de Brasília. A tarefa roda no máximo 1× por dia.
  deveRodar(agora: HoraLocal): boolean
  executar(): Promise<unknown>
}

// Agendador em processo: a cada minuto roda as tarefas cujo horário chegou e que ainda não rodaram hoje.
// Se o servidor estava hibernando no horário (RNF20), a tarefa roda assim que ele acordar no mesmo dia.
export class Agendador {
  private readonly ultimoDia = new Map<string, string>()
  private timer: NodeJS.Timeout | undefined

  constructor(
    private readonly tarefas: Tarefa[],
    private readonly intervaloMs = 60_000,
  ) {}

  iniciar(): void {
    if (this.timer) return
    this.timer = setInterval(() => void this.verificar(), this.intervaloMs)
    void this.verificar()
  }

  parar(): void {
    clearInterval(this.timer)
    this.timer = undefined
  }

  async verificar(instante = new Date()): Promise<void> {
    const agora = Formato.horaLocal(instante)
    for (const tarefa of this.tarefas) {
      if (this.ultimoDia.get(tarefa.nome) === agora.dia || !tarefa.deveRodar(agora)) continue
      this.ultimoDia.set(tarefa.nome, agora.dia)
      try {
        await tarefa.executar()
        console.log(`[agendador] ${tarefa.nome}: concluída`)
      } catch (erro) {
        console.error(`[agendador] ${tarefa.nome}: falhou`, erro)
      }
    }
  }
}
