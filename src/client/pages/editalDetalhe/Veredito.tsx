import type { Avaliacao, StatusEdital } from '../../../shared/tipos/edital'

type Props = {
  avaliacao: Avaliacao | null
  status: StatusEdital
  // Mensagem do processamento automático (perfil provisório, leitura por IA que falhou…).
  aviso: string | null
  // Falhas seguidas da leitura por IA e quando foi a última (para dizer quando o sistema tenta de novo).
  tentativas?: number
  atualizadoEm?: string
}

// Iguais às do processamento automático (ProcessamentoEditalServico).
const MAXIMO_TENTATIVAS = 3
const ESPERA_NOVA_TENTATIVA_MIN = 15

function proximaTentativa(atualizadoEm: string | undefined): string {
  if (!atualizadoEm) return 'em alguns minutos'
  const quando = new Date(new Date(atualizadoEm).getTime() + ESPERA_NOVA_TENTATIVA_MIN * 60_000)
  return quando <= new Date() ? 'no próximo minuto' : `por volta das ${quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

export function Veredito({ avaliacao: a, status, aviso, tentativas = 0, atualizadoEm }: Props) {
  const emProcessamento = status === 'COLETADO' || status === 'EM_ANALISE'
  return (
    <div className="card detalhe-bloco">
      <div className="card__cabecalho">
        <h2>Veredito</h2>
      </div>
      <div className="card__corpo">
        {aviso && (
          <p className="aviso aviso--atencao" role="status">
            {status === 'FALHA' && tentativas < MAXIMO_TENTATIVAS
              ? `A leitura por IA falhou (tentativa ${tentativas} de ${MAXIMO_TENTATIVAS}): ${aviso} O sistema tenta de novo sozinho ${proximaTentativa(atualizadoEm)}.`
              : aviso}
          </p>
        )}
        {!a ? (
          <p className="discreto">
            {emProcessamento
              ? 'Em processamento: o sistema está lendo o edital e calculando a nota. Esta tela se atualiza sozinha.'
              : 'A avaliação automática ainda não foi registrada.'}
          </p>
        ) : (
          <div className="pilha">
            <div className="linha" style={{ gap: 'var(--esp-3)' }}>
              <span className={`badge badge--${a.status_elegibilidade.toLowerCase()}`}>
                {a.status_elegibilidade === 'ELEGIVEL'
                  ? '✓ Elegível'
                  : a.status_elegibilidade === 'INELEGIVEL'
                    ? '✕ Inelegível'
                    : '? Indeterminado'}
              </span>
              {a.status_elegibilidade === 'ELEGIVEL' && (
                <div className="fit">
                  <strong className="fit__nota">
                    {a.nota_ajustada_manual ?? a.nota_fit ?? '—'}
                  </strong>
                  <span className="discreto">
                    Fit / 100 · {a.classificacao ?? 'sem faixa'}
                  </span>
                </div>
              )}
            </div>

            {!!a.criterios_violados?.length && (
              <ul className="pendencias" style={{ marginTop: 'var(--esp-2)' }}>
                {a.criterios_violados.map((x) => (
                  <li key={x.criterio_id}>
                    <strong>{x.nome}:</strong> {x.motivo}
                  </li>
                ))}
              </ul>
            )}

            {!!a.criterios_indeterminados?.length && (
              <ul className="pendencias" style={{ marginTop: 'var(--esp-2)' }}>
                {a.criterios_indeterminados.map((x) => (
                  <li key={x.criterio_id}>
                    <strong>{x.nome}:</strong> verificar manualmente —{' '}
                    {x.campo_faltante}
                  </li>
                ))}
              </ul>
            )}

            {!!a.detalhamento_pontuacao?.length && (
              <table className="tabela" style={{ marginTop: 'var(--esp-2)' }}>
                <thead>
                  <tr>
                    <th>Critério</th>
                    <th>Peso</th>
                    <th>Pontuação</th>
                    <th>Contribuição</th>
                  </tr>
                </thead>
                <tbody>
                  {a.detalhamento_pontuacao.map((x) => (
                    <tr key={x.criterio_id}>
                      <td>{x.nome ?? x.criterio_id}</td>
                      <td className="mono">{x.peso}</td>
                      <td className="mono">{x.pontuacao}</td>
                      <td className="mono">{x.contribuicao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
