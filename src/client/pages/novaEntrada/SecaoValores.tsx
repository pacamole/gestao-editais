import type { PropsSecao } from './tipos'

// Cadastro manual, bloco 3: recursos financeiros e contrapartida.
export function SecaoValores({ valores, onAlterar, processando }: PropsSecao) {
  return (
    <div className="pilha">
      <h3>3. Valores e Contrapartida</h3>
      <div className="grade-2">
        <div className="campo">
          <label htmlFor="man-val-total">Valor Total Disponível (R$)</label>
          <input
            id="man-val-total"
            type="number"
            step="0.01"
            className="input"
            placeholder="Ex: 10000000"
            value={valores.valorTotal}
            onChange={(e) => onAlterar({ valorTotal: e.target.value })}
            disabled={processando}
          />
        </div>

        <div className="campo">
          <label htmlFor="man-val-max">Valor Máximo por Projeto (R$)</label>
          <input
            id="man-val-max"
            type="number"
            step="0.01"
            className="input"
            placeholder="Ex: 2500000"
            value={valores.valorMaximo}
            onChange={(e) => onAlterar({ valorMaximo: e.target.value })}
            disabled={processando}
          />
        </div>

        <div className="campo" style={{ justifyContent: 'center' }}>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={valores.exigeContrapartida}
              onChange={(e) => onAlterar({ exigeContrapartida: e.target.checked })}
              disabled={processando}
            />
            Exige contrapartida financeira
          </label>
        </div>

        {valores.exigeContrapartida && (
          <div className="campo">
            <label htmlFor="man-perc-contra">Percentual de Contrapartida (%)</label>
            <input
              id="man-perc-contra"
              type="number"
              step="0.1"
              className="input"
              placeholder="Ex: 15"
              value={valores.percentualContrapartida}
              onChange={(e) => onAlterar({ percentualContrapartida: e.target.value })}
              disabled={processando}
            />
          </div>
        )}
      </div>
    </div>
  )
}
