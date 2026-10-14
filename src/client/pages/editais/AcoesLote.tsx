import { useState } from 'react'

type Props = {
  selecionados: number
  executando: boolean
  onAprovar: () => void
  // Devolve true quando o descarte deu certo (fecha o diálogo).
  onDescartar: (justificativa: string) => Promise<boolean>
  onCancelarSelecao: () => void
}

// Barra de ações em lote e diálogo de justificativa obrigatória para descarte.
export function AcoesLote({ selecionados, executando, onAprovar, onDescartar, onCancelarSelecao }: Props) {
  const [descarteAberto, setDescarteAberto] = useState(false)
  const [justificativa, setJustificativa] = useState('')

  function fecharDescarte() {
    setDescarteAberto(false)
    setJustificativa('')
  }

  async function confirmarDescarte() {
    if (await onDescartar(justificativa)) fecharDescarte()
  }

  return (
    <>
      {selecionados > 0 && (
        <div className="lote linha linha--entre">
          <span style={{ fontWeight: 600 }}>
            {selecionados} {selecionados === 1 ? 'edital selecionado' : 'editais selecionados'}
          </span>
          <div className="linha">
            <button className="btn btn--sucesso btn--sm" onClick={onAprovar} disabled={executando}>
              ✓ Aprovar selecionados
            </button>
            <button
              className="btn btn--perigo btn--sm"
              onClick={() => setDescarteAberto(true)}
              disabled={executando}
            >
              ✕ Descartar selecionados
            </button>
            <button className="btn btn--sm btn--fantasma" onClick={onCancelarSelecao}>
              Cancelar seleção
            </button>
          </div>
        </div>
      )}

      {descarteAberto && (
        <div
          style={{
            padding: 'var(--esp-4)',
            background: 'var(--vermelho-fundo, #fee2e2)',
            borderBottom: '1px solid var(--cor-linha)',
          }}
        >
          <div className="pilha">
            <strong style={{ color: 'var(--vermelho-texto, #991b1b)' }}>
              Justificativa para descarte em lote de {selecionados} edital(is):
            </strong>
            <div className="campo">
              <textarea
                className="textarea"
                placeholder="Informe o motivo do descarte (obrigatório pela política de revisão)..."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={2}
              />
            </div>
            <div className="linha">
              <button
                className="btn btn--perigo btn--sm"
                onClick={confirmarDescarte}
                disabled={executando || !justificativa.trim()}
              >
                {executando ? 'Descartando...' : 'Confirmar descarte'}
              </button>
              <button className="btn btn--sm" onClick={fecharDescarte}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
