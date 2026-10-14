import { Link } from 'react-router'
import type { EditalUrgente } from '../../../shared/tipos/dashboard'
import { formatarData } from '../../util/formato'

function textoRestante(dias: number) {
  if (dias < 0) return 'Vencido'
  if (dias === 0) return 'Hoje'
  return `${dias} dias`
}

// Cinco editais ativos com menor prazo restante.
export function EditaisUrgentes({ itens }: { itens: EditalUrgente[] }) {
  return (
    <section className="card">
      <div className="card__cabecalho linha linha--entre">
        <div>
          <h2>Editais urgentes</h2>
          <p className="discreto">5 oportunidades ativas com menor prazo restante</p>
        </div>
        <Link to="/editais?prazo_urgente=1" className="btn btn--sm btn--fantasma">
          Ver urgentes →
        </Link>
      </div>

      <div className="card__corpo card__corpo--justo">
        {itens.length === 0 ? (
          <div className="vazio">Nenhum edital com prazo urgente pendente.</div>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Título</th>
                <th>Órgão</th>
                <th>Prazo</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id}>
                  <td className="tabela__titulo">
                    <Link to={`/editais/${item.id}`} title={item.titulo}>
                      {item.titulo}
                    </Link>
                  </td>
                  <td className="discreto">{item.orgao_financiador || '—'}</td>
                  <td>
                    <span className={`prazo ${item.urgente ? 'prazo--urgente' : ''}`}>
                      <span className="prazo__data">{formatarData(item.prazo_inscricao)}</span>
                      <span className="prazo__restante">{textoRestante(item.dias_restantes)}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
