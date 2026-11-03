import type { LinhaFormula, OrigemTermo, Simbolo } from './montarFormula'

const ORIGEM: Record<OrigemTermo, string> = {
  edital: 'dado do edital',
  perfil: 'dado do perfil da empresa',
  fixo: 'valor do critério',
  sistema: 'calculado pelo sistema',
}

function SimboloView({ simbolo: s }: { simbolo: Simbolo }) {
  if (s.tipo === 'op') return <span className="formula__op">{s.texto}</span>
  return <span className={`formula__termo formula__termo--${s.origem}`} title={ORIGEM[s.origem]}>{s.texto}</span>
}

// O critério como conta, com os parâmetros do cadastro.
export function FormulaCriterio({ linhas }: { linhas: LinhaFormula[] }) {
  if (!linhas.length) return null
  return (
    <div className="formula" role="group" aria-label="Conta do critério">
      {linhas.map((linha) => (
        <div key={linha.rotulo} className="formula__linha">
          <span className="formula__rotulo">{linha.rotulo}</span>
          <span className="formula__expressao">
            {linha.simbolos.map((s, j) => <SimboloView key={j} simbolo={s} />)}
          </span>
        </div>
      ))}
    </div>
  )
}

// Legenda das cores dos termos usados nas contas.
export function LegendaFormula() {
  return (
    <div className="formula-legenda">
      <span><span className="formula__termo formula__termo--edital">azul</span> dado lido do edital</span>
      <span><span className="formula__termo formula__termo--perfil">verde</span> dado do perfil da empresa</span>
      <span><span className="formula__termo formula__termo--fixo">cinza</span> valor do critério</span>
      <span><span className="formula__termo formula__termo--sistema">tracejado</span> calculado na hora</span>
    </div>
  )
}
