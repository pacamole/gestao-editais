import type { EstadoRotina, RegistroRotinas, Tarefa } from "./agendador.js";
import { repositorios } from "../repositorios/index.js";
import { coletaServico, editalServico, fonteServico, gatilhosNotificacao } from "../composicao.js";
import { portalDaFonte } from "../servicos/coleta/portais/index.js";

export const registroRotinas: RegistroRotinas = {
  obter: (nome) =>
    JSON.parse(
      repositorios.config.obter(`rotina:${nome}`) ?? '{"historico":[]}',
    ) as EstadoRotina,
  salvar: (nome, estado) =>
    repositorios.config.definir(`rotina:${nome}`, JSON.stringify(estado)),
};

// Aceita a frequência diária já prevista no schema. Outros cron não são interpretados silenciosamente.
export function horaColeta(cron: string | null): string {
  const partes = /^(\d{1,2}) (\d{1,2}) \* \* \*$/.exec(cron ?? "0 6 * * *");
  if (!partes || Number(partes[1]) > 59 || Number(partes[2]) > 23)
    throw new Error("Use cron diário: minuto hora * * *");
  return `${partes[2].padStart(2, "0")}:${partes[1].padStart(2, "0")}`;
}

export function tarefasColeta(): Tarefa[] {
  fonteServico.garantirFontesPadrao();
  return [
    ...repositorios.fonte
      .listar()
      .filter((f) => portalDaFonte(f.nome))
      .map(
        (f): Tarefa => ({
          nome: `Coleta ${f.id}`,
          recuperarAtrasada: true,
          deveRodar: (agora) => {
            const fonte = repositorios.fonte.buscarPorId(f.id);
            if (!fonte?.ativo || fonte.tipo !== "SCRAPER") return false;
            try {
              return agora.hora >= horaColeta(fonte.frequencia_cron);
            } catch (erro) {
              console.error(`[coleta] ${fonte.nome}:`, erro);
              return false;
            }
          },
          executar: async () => {
            const fonte = repositorios.fonte.buscarPorId(f.id);
            if (!fonte?.ativo || fonte.tipo !== "SCRAPER") return;
            try {
              await coletaServico.coletar(fonte);
            } finally {
              await gatilhosNotificacao.coletaFinalizada(f.id);
            }
          },
        }),
      ),
    {
      nome: "Expiração de editais",
      recuperarAtrasada: true,
      deveRodar: (agora) => agora.hora >= "07:00",
      executar: async () => editalServico.expirarVencidos(),
    },
  ];
}

// RNF05: prazos verificados 1× por dia, às 07:00.
const HORA_VERIFICACAO_PRAZOS = "07:00";

export const tarefasNotificacao: Tarefa[] = [
  {
    nome: "E02 alerta de prazo",
    recuperarAtrasada: true,
    deveRodar: (agora) => agora.hora >= HORA_VERIFICACAO_PRAZOS,
    executar: () => gatilhosNotificacao.verificarPrazos(),
  },
  {
    nome: "E04 resumo semanal",
    deveRodar: (agora) => {
      const { dia_semana, hora } = repositorios.configAlerta.obter("E04").parametros;
      return agora.diaSemana === dia_semana && agora.hora >= hora;
    },
    executar: () => gatilhosNotificacao.resumoSemanal(),
  },
];
