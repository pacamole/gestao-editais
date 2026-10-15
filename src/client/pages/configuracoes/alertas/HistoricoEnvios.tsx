import { useState } from 'react'
import { CATALOGO_ALERTAS, TIPOS_NOTIFICACAO } from '../../../../shared/catalogoAlertas'
import type { NotificacaoLog, TipoNotificacao } from '../../../../shared/tipos/alertas'
import { formatarDataHora } from '../../../util/formato'

type FiltroStatus = 'TODOS' | NotificacaoLog['status_envio']

const ABAS_STATUS: { valor: FiltroStatus; rotulo: string }[] = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'ENVIADO', rotulo: 'Enviados' },
  { valor: 'FALHOU', rotulo: 'Falhas' },
]

export function HistoricoEnvios({ logs }: { logs: NotificacaoLog[] }) {
  const [tipo, setTipo] = useState<TipoNotificacao | ''>('')
  const [status, setStatus] = useState<FiltroStatus>('TODOS')

  const visiveis = logs.filter((l) => (!tipo || l.tipo === tipo) && (status === 'TODOS' || l.status_envio === status))

  return (
    <div className="card">
      <div className="card__cabecalho">
        <h2>Histórico de envios</h2>
        <div className="linha">
          <select
            className="select alerta__filtro"
            aria-label="Filtrar por tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoNotificacao | '')}
          >
            <option value="">Todos os alertas</option>
            {TIPOS_NOTIFICACAO.map((t) => (
              <option key={t} value={t}>
                {t} · {CATALOGO_ALERTAS[t].nome}
              </option>
            ))}
          </select>
          <div className="segmentado" role="radiogroup" aria-label="Filtrar por status">
            {ABAS_STATUS.map((a) => (
              <button key={a.valor} type="button" role="radio" aria-checked={status === a.valor} onClick={() => setStatus(a.valor)}>
                {a.rotulo}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="card__corpo card__corpo--justo historico">
        {visiveis.length ? (
          <table className="tabela">
            <thead>
              <tr>
                <th>Alerta</th>
                <th>Assunto</th>
                <th>Para</th>
                <th>Status</th>
                <th>Quando</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((l) => (
                <tr key={l.id}>
                  <td title={CATALOGO_ALERTAS[l.tipo]?.nome}>
                    <span className="alerta__codigo">{l.tipo}</span>
                  </td>
                  <td>{l.assunto}</td>
                  <td title={l.destinatarios.join(', ')}>
                    {l.destinatarios.length === 1 ? l.destinatarios[0] : `${l.destinatarios.length} pessoas`}
                  </td>
                  <td>
                    {l.status_envio === 'ENVIADO' ? (
                      <span className="badge badge--elegivel">✓ Enviado</span>
                    ) : (
                      <span className="badge badge--inelegivel">✕ Falhou</span>
                    )}
                  </td>
                  <td className="discreto historico__quando">{formatarDataHora(l.enviado_em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="vazio">{logs.length ? 'Nenhum envio com esses filtros.' : 'Nenhuma notificação enviada até o momento.'}</p>
        )}
      </div>
    </div>
  )
}
