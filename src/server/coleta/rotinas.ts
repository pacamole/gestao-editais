import type { EstadoRotina, RegistroRotinas, Tarefa } from '../infra/agendador.js'
import { repositorios } from '../repositorios/index.js'
import { gatilhosNotificacao } from '../notificacao/index.js'
import { cadastrarFontes, FONTES_AUTOMATICAS } from './fontes.js'
import { ColetaServico } from './servico.js'

export const registroRotinas: RegistroRotinas = {
  obter: (nome) => JSON.parse(repositorios.config.obter(`rotina:${nome}`) ?? '{"historico":[]}') as EstadoRotina,
  salvar: (nome, estado) => repositorios.config.definir(`rotina:${nome}`, JSON.stringify(estado)),
}

export function expirarEditais(instante = new Date()): number {
  let total = 0
  const ativos = repositorios.edital.listarComPrazo(['COLETADO', 'EM_ANALISE', 'ANALISADO', 'FALHA', 'EM_REVISAO', 'APROVADO'])
  for (const edital of ativos) {
    // Datas sem hora vencem ao final do dia de Brasília.
    const limite = /^\d{4}-\d{2}-\d{2}$/.test(edital.prazo_inscricao!) ? `${edital.prazo_inscricao}T23:59:59.999-03:00` : edital.prazo_inscricao!
    if (Date.parse(limite) < instante.getTime()) {
      repositorios.edital.atualizar(edital.id, { status: 'EXPIRADO' })
      total++
    }
  }
  return total
}

// Aceita a frequência diária já prevista no schema. Outros cron não são interpretados silenciosamente.
export function horaColeta(cron: string | null): string {
  const partes = /^(\d{1,2}) (\d{1,2}) \* \* \*$/.exec(cron ?? '0 6 * * *')
  if (!partes || Number(partes[1]) > 59 || Number(partes[2]) > 23) throw new Error('Use cron diário: minuto hora * * *')
  return `${partes[2].padStart(2, '0')}:${partes[1].padStart(2, '0')}`
}

export function tarefasColeta(): Tarefa[] {
  cadastrarFontes(repositorios)
  const servico = new ColetaServico(repositorios)
  return [
    ...repositorios.fonte.listar().filter((f) => f.nome in FONTES_AUTOMATICAS).map((f): Tarefa => ({
      nome: `Coleta ${f.id}`, recuperarAtrasada: true,
      deveRodar: (agora) => {
        const fonte = repositorios.fonte.buscarPorId(f.id)
        if (!fonte?.ativo || fonte.tipo !== 'SCRAPER') return false
        try { return agora.hora >= horaColeta(fonte.frequencia_cron) }
        catch (erro) { console.error(`[coleta] ${fonte.nome}:`, erro); return false }
      },
      executar: async () => {
        const fonte = repositorios.fonte.buscarPorId(f.id)
        if (!fonte?.ativo || fonte.tipo !== 'SCRAPER') return
        try { await servico.coletar(fonte) }
        finally { await gatilhosNotificacao.coletaFinalizada(f.id) }
      },
    })),
    { nome: 'Expiração de editais', recuperarAtrasada: true, deveRodar: (agora) => agora.hora >= '07:00', executar: async () => expirarEditais() },
  ]
}
