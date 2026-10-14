import type { PropsSecao } from './tipos'

// Cadastro manual, bloco 2: cronograma e prazos.
export function SecaoCronograma({ valores, onAlterar, processando }: PropsSecao) {
  return (
    <div className="pilha">
      <h3>2. Cronograma e Prazos</h3>
      <div className="grade-3">
        <div className="campo">
          <label htmlFor="man-data-pub">Data de Publicação</label>
          <input
            id="man-data-pub"
            type="date"
            className="input"
            value={valores.dataPublicacao}
            onChange={(e) => onAlterar({ dataPublicacao: e.target.value })}
            disabled={processando}
          />
        </div>

        <div className="campo">
          <label htmlFor="man-prazo">Prazo de Inscrição *</label>
          <input
            id="man-prazo"
            type="date"
            className="input"
            value={valores.prazoInscricao}
            onChange={(e) => onAlterar({ prazoInscricao: e.target.value })}
            disabled={processando}
          />
        </div>

        <div className="campo">
          <label htmlFor="man-data-res">Resultado Previsto</label>
          <input
            id="man-data-res"
            type="date"
            className="input"
            value={valores.dataResultado}
            onChange={(e) => onAlterar({ dataResultado: e.target.value })}
            disabled={processando}
          />
        </div>
      </div>
    </div>
  )
}
