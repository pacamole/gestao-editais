import { MODALIDADES, STATUS_EDITAL } from '../../../shared/rotulos'
import type { FonteComExecucoes } from '../../../shared/tipos/fontes'
import type { FiltrosEditais as Filtros } from '../../../shared/tipos/editais'

type Props = {
  filtros: Filtros
  fontes: FonteComExecucoes[]
  onAlterar: (parcial: Partial<Filtros>) => void
  onLimpar: () => void
}

// Barra de filtros combinados (Tarefa 12).
export function FiltrosEditais({ filtros, fontes, onAlterar, onLimpar }: Props) {
  return (
    <div className="filtros">
      {/* Busca textual por título ou órgão */}
      <div className="campo campo--busca">
        <label htmlFor="filtro-busca">Busca por texto</label>
        <input
          id="filtro-busca"
          type="text"
          className="input"
          placeholder="Buscar título, órgão financiador ou número..."
          value={filtros.busca}
          onChange={(e) => onAlterar({ busca: e.target.value })}
        />
      </div>

      <div className="campo">
        <label htmlFor="filtro-status">Status</label>
        <select
          id="filtro-status"
          className="select"
          value={filtros.status}
          onChange={(e) => onAlterar({ status: e.target.value })}
        >
          <option value="TODOS">Todos os status</option>
          {Object.entries(STATUS_EDITAL).map(([chave, rotulo]) => (
            <option key={chave} value={chave}>
              {rotulo}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label htmlFor="filtro-elegibilidade">Elegibilidade</label>
        <select
          id="filtro-elegibilidade"
          className="select"
          value={filtros.elegibilidade}
          onChange={(e) => onAlterar({ elegibilidade: e.target.value })}
        >
          <option value="TODAS">Todas</option>
          <option value="ELEGIVEL">Elegível</option>
          <option value="INDETERMINADO">Indeterminado</option>
          <option value="INELEGIVEL">Inelegível</option>
        </select>
      </div>

      <div className="campo">
        <label htmlFor="filtro-fit">Faixa de Nota</label>
        <select
          id="filtro-fit"
          className="select"
          value={filtros.faixaFit}
          onChange={(e) => onAlterar({ faixaFit: e.target.value })}
        >
          <option value="TODAS">Todas as faixas</option>
          <option value="ALTO">Alto fit (≥ 70)</option>
          <option value="MEDIO">Médio fit (40–69)</option>
          <option value="BAIXO">Baixo fit (&lt; 40)</option>
        </select>
      </div>

      <div className="campo">
        <label htmlFor="filtro-modalidade">Modalidade</label>
        <select
          id="filtro-modalidade"
          className="select"
          value={filtros.modalidade}
          onChange={(e) => onAlterar({ modalidade: e.target.value })}
        >
          <option value="TODAS">Todas</option>
          {Object.entries(MODALIDADES).map(([chave, rotulo]) => (
            <option key={chave} value={chave}>
              {rotulo}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label htmlFor="filtro-fonte">Fonte</label>
        <select
          id="filtro-fonte"
          className="select"
          value={filtros.fonteId}
          onChange={(e) => onAlterar({ fonteId: e.target.value })}
        >
          <option value="TODAS">Todas as fontes</option>
          {fontes.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Intervalo de prazo */}
      <div className="campo" style={{ minWidth: 130 }}>
        <label htmlFor="filtro-prazo-de">Prazo de</label>
        <input
          id="filtro-prazo-de"
          type="date"
          className="input"
          value={filtros.prazoDe}
          onChange={(e) => onAlterar({ prazoDe: e.target.value })}
        />
      </div>

      <div className="campo" style={{ minWidth: 130 }}>
        <label htmlFor="filtro-prazo-ate">Prazo até</label>
        <input
          id="filtro-prazo-ate"
          type="date"
          className="input"
          value={filtros.prazoAte}
          onChange={(e) => onAlterar({ prazoAte: e.target.value })}
        />
      </div>

      <div className="linha" style={{ paddingBottom: 6 }}>
        <label className="checkbox" title="Filtrar editais cujo prazo de inscrição ainda não expirou">
          <input
            type="checkbox"
            checked={filtros.somentePrazoAberto}
            onChange={(e) => onAlterar({ somentePrazoAberto: e.target.checked })}
          />
          Prazo aberto
        </label>

        <button className="btn btn--sm btn--fantasma" onClick={onLimpar} title="Limpar todos os filtros">
          Limpar filtros
        </button>
      </div>
    </div>
  )
}
