import type { Avaliacao } from '../../../shared/tipos/edital'

type Props = { avaliacao: Avaliacao | null }

export function Veredito({ avaliacao: a }: Props) {
  return (
    <div className="card detalhe-bloco">
      <div className="card__cabecalho">
        <h2>Veredito</h2>
      </div>
      <div className="card__corpo">
        {!a ? (
          <p className="discreto">
            A avaliação automática ainda não foi registrada.
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
