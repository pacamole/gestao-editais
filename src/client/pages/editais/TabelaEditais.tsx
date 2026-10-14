import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { MODALIDADES, STATUS_EDITAL } from '../../../shared/rotulos'
import type { ItemListaEdital } from '../../../shared/tipos/editais'
import { formatarData, formatarMoeda } from '../../util/formato'

type Props = {
  itens: ItemListaEdital[] | null
  carregando: boolean
  selecionados: string[]
  onAlternarTodos: () => void
  onAlternarItem: (id: string) => void
}

function classeDoFit(nota: number | null): string {
  if (nota == null) return 'fit--vazio'
  if (nota >= 70) return 'fit--alto'
  if (nota >= 40) return 'fit--medio'
  return 'fit--baixo'
}

const ELEGIBILIDADE_BADGE: Record<string, { classe: string; rotulo: string }> = {
  ELEGIVEL: { classe: 'badge--elegivel', rotulo: '✓ Elegível' },
  INELEGIVEL: { classe: 'badge--inelegivel', rotulo: '✕ Inelegível' },
  INDETERMINADO: { classe: 'badge--indeterminado', rotulo: '? Indeterminado' },
}

function textoDiasRestantes(dias: number | null): string {
  if (dias == null) return '—'
  if (dias < 0) return 'Vencido'
  if (dias === 0) return 'Hoje'
  return `${dias} dias`
}

// Tabela paginada de editais com seleção de linhas.
export function TabelaEditais({ itens, carregando, selecionados, onAlternarTodos, onAlternarItem }: Props) {
  return (
    <div className="card__corpo card__corpo--justo">
      {carregando && !itens ? (
        <div className="vazio">Carregando lista de editais...</div>
      ) : !itens || itens.length === 0 ? (
        <div className="vazio">Nenhum edital encontrado com a combinação de filtros selecionada.</div>
      ) : (
        <table className="tabela">
          <thead>
            <tr>
              <th className="tabela__selecao">
                <input
                  type="checkbox"
                  aria-label="Selecionar todos os editais desta página"
                  checked={itens.length > 0 && selecionados.length === itens.length}
                  onChange={onAlternarTodos}
                />
              </th>
              <th>Título</th>
              <th>Órgão</th>
              <th>Modalidade</th>
              <th>Prazo</th>
              <th className="tabela__num">Valor Máximo</th>
              <th>Elegibilidade</th>
              <th>Nota de Fit</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <LinhaEdital
                key={item.id}
                item={item}
                selecionado={selecionados.includes(item.id)}
                onAlternar={() => onAlternarItem(item.id)}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function LinhaEdital({
  item,
  selecionado,
  onAlternar,
}: {
  item: ItemListaEdital
  selecionado: boolean
  onAlternar: () => void
}) {
  const nota = item.nota_ajustada_manual ?? item.nota_fit
  const eleg = item.status_elegibilidade?.toUpperCase()
  // Valor desconhecido mantém o comportamento antigo: badge sem classe com "? Indeterminado".
  const badgeEleg = eleg ? ELEGIBILIDADE_BADGE[eleg] ?? { classe: '', rotulo: '? Indeterminado' } : null

  return (
    <tr>
      <td className="tabela__selecao">
        <input
          type="checkbox"
          aria-label={`Selecionar edital ${item.titulo}`}
          checked={selecionado}
          onChange={onAlternar}
        />
      </td>

      <td className="tabela__titulo">
        <Link to={`/editais/${item.id}`} title={item.titulo}>
          {item.titulo}
        </Link>
        {item.numero_edital && (
          <div className="discreto" style={{ fontSize: 'var(--texto-xs)' }}>
            Edital nº {item.numero_edital}
          </div>
        )}
      </td>

      <td className="discreto">{item.orgao_financiador || '—'}</td>

      <td>
        <span className="badge badge--modalidade">
          {item.modalidade ? MODALIDADES[item.modalidade] || item.modalidade : '—'}
        </span>
      </td>

      <td>
        {item.prazo_inscricao ? (
          <span className={`prazo ${item.prazo_urgente ? 'prazo--urgente' : ''}`}>
            <span className="prazo__data">{formatarData(item.prazo_inscricao)}</span>
            <span className="prazo__restante">{textoDiasRestantes(item.dias_restantes)}</span>
          </span>
        ) : (
          <span className="discreto">—</span>
        )}
      </td>

      <td className="tabela__num mono">{formatarMoeda(item.valor_maximo_por_projeto)}</td>

      <td>
        {badgeEleg ? (
          <span className={`badge ${badgeEleg.classe}`}>{badgeEleg.rotulo}</span>
        ) : (
          <span className="discreto">—</span>
        )}
      </td>

      <td>
        <span className={`fit ${classeDoFit(nota)}`}>
          <span className="fit__nota">{nota ?? '—'}</span>
          {nota != null && <span className="fit__barra" style={{ '--fit': nota } as CSSProperties} />}
        </span>
      </td>

      <td>
        <span className={`status status--${item.status.toLowerCase()}`}>
          {STATUS_EDITAL[item.status] || item.status}
        </span>
      </td>
    </tr>
  )
}
