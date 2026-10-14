import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import type { EditalTopFit } from '../../../shared/tipos/dashboard'

function classeFaixa(nota: number | null) {
  if (nota == null) return 'fit--vazio'
  if (nota >= 70) return 'fit--alto'
  if (nota >= 40) return 'fit--medio'
  return 'fit--baixo'
}

// Cinco editais elegíveis, ainda não decididos, com maior nota de fit.
export function TopFit({ itens }: { itens: EditalTopFit[] }) {
  return (
    <section className="card">
      <div className="card__cabecalho linha linha--entre">
        <div>
          <h2>Top Fit Comercial</h2>
          <p className="discreto">5 editais elegíveis com maior nota ainda não decididos</p>
        </div>
        <Link to="/editais?elegibilidade=ELEGIVEL&faixaFit=ALTO" className="btn btn--sm btn--fantasma">
          Ver elegíveis →
        </Link>
      </div>

      <div className="card__corpo card__corpo--justo">
        {itens.length === 0 ? (
          <div className="vazio">Nenhum edital elegível pendente no momento.</div>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Título</th>
                <th>Órgão</th>
                <th>Fit Comercial</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => {
                const nota = item.nota_ajustada_manual ?? item.nota_fit
                return (
                  <tr key={item.id}>
                    <td className="tabela__titulo">
                      <Link to={`/editais/${item.id}`} title={item.titulo}>
                        {item.titulo}
                      </Link>
                    </td>
                    <td className="discreto">{item.orgao_financiador || '—'}</td>
                    <td>
                      <span className={`fit ${classeFaixa(nota)}`}>
                        <span className="fit__nota">{nota ?? '—'}</span>
                        {nota != null && (
                          <span className="fit__barra" style={{ '--fit': nota } as CSSProperties} />
                        )}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
