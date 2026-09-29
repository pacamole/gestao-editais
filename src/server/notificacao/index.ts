import type { Tarefa } from '../agendador.js'
import { repositorios } from '../repositorios/index.js'
import { GatilhosNotificacao } from './gatilhos.js'
import { NotificacaoServico } from './servico.js'
import { criarTransporte } from './transporte.js'

// RNF05: prazos verificados 1× por dia, às 07:00.
const HORA_VERIFICACAO_PRAZOS = '07:00'

export const notificacaoServico = new NotificacaoServico(criarTransporte(), repositorios)
export const gatilhosNotificacao = new GatilhosNotificacao(notificacaoServico, repositorios)

export const tarefasNotificacao: Tarefa[] = [
  {
    nome: 'E02 alerta de prazo',
    deveRodar: (agora) => agora.hora >= HORA_VERIFICACAO_PRAZOS,
    executar: () => gatilhosNotificacao.verificarPrazos(),
  },
  {
    nome: 'E04 resumo semanal',
    deveRodar: (agora) => {
      const { dia_semana, hora } = repositorios.configAlerta.obter('E04').parametros
      return agora.diaSemana === dia_semana && agora.hora >= hora
    },
    executar: () => gatilhosNotificacao.resumoSemanal(),
  },
]
