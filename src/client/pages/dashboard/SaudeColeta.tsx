import { Link } from 'react-router'
import type { SaudeFonte, StatusSaudeColeta } from '../../../shared/tipos/dashboard'
import { formatarDataHora } from '../../util/formato'

const CLASSE_STATUS: Partial<Record<StatusSaudeColeta, string>> = {
  SUCESSO: 'saude--sucesso',
  PARCIAL: 'saude--parcial',
  FALHA: 'saude--falha',
}

// Última execução e status de cada fonte monitorada.
export function SaudeColeta({ fontes }: { fontes: SaudeFonte[] }) {
  return (
    <section className="card">
      <div className="card__cabecalho linha linha--entre">
        <div>
          <h2>Painel de saúde da coleta</h2>
          <p className="discreto">Última execução e status de cada fonte monitorada</p>
        </div>
        <Link to="/configuracoes/fontes" className="btn btn--sm btn--fantasma">
          Gerenciar fontes →
        </Link>
      </div>

      <div className="card__corpo card__corpo--justo">
        <table className="tabela">
          <thead>
            <tr>
              <th>Fonte</th>
              <th>Situação</th>
              <th>Última execução</th>
              <th className="tabela__num">Coletados</th>
            </tr>
          </thead>
          <tbody>
            {fontes.map((f) => (
              <tr key={f.fonte_id}>
                <td>
                  <strong>{f.nome}</strong>
                  <div className="discreto" style={{ fontSize: 'var(--texto-xs)' }}>
                    {f.tipo}
                  </div>
                </td>
                <td>
                  <span className={`saude ${CLASSE_STATUS[f.status] ?? ''}`} title={f.mensagem_erro || f.status}>
                    {f.status}
                  </span>
                </td>
                <td className="discreto">{formatarDataHora(f.ultima_coleta_em, 'Nunca executada')}</td>
                <td className="tabela__num mono">{f.itens_coletados}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
