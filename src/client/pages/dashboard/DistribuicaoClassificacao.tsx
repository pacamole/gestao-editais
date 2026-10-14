import type { DistribuicaoFit } from '../../../shared/tipos/dashboard'

type PropsFaixa = {
  rotulo: string
  corRotulo: string
  corBarra: string
  valor: number
  total: number
}

// Uma faixa: rótulo, contagem e barra proporcional ao total.
function Faixa({ rotulo, corRotulo, corBarra, valor, total }: PropsFaixa) {
  const percentual = total > 0 ? Math.round((valor / total) * 100) : 0
  return (
    <div>
      <div className="linha linha--entre" style={{ marginBottom: 4 }}>
        <span className="badge badge--modalidade" style={{ color: corRotulo }}>
          {rotulo}
        </span>
        <strong className="mono">{valor}</strong>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 4,
          background: 'var(--cinza-fundo)',
          overflow: 'hidden',
        }}
      >
        <div style={{ height: '100%', width: `${percentual}%`, background: corBarra }} />
      </div>
    </div>
  )
}

// Aderência dos editais avaliados: Alto / Médio / Baixo fit.
export function DistribuicaoClassificacao({ distribuicao }: { distribuicao: DistribuicaoFit }) {
  return (
    <section className="card">
      <div className="card__cabecalho">
        <h2>Distribuição por classificação</h2>
        <p className="discreto">Aderência dos editais avaliados ao perfil da I9+</p>
      </div>
      <div className="card__corpo">
        <div className="pilha">
          <Faixa
            rotulo="Alto Fit (≥ 70)"
            corRotulo="var(--verde-texto)"
            corBarra="var(--verde-primario, #10b981)"
            valor={distribuicao.alto}
            total={distribuicao.total}
          />
          <Faixa
            rotulo="Médio Fit (40–69)"
            corRotulo="var(--ambar-texto, #b45309)"
            corBarra="var(--ambar-primario, #f59e0b)"
            valor={distribuicao.medio}
            total={distribuicao.total}
          />
          <Faixa
            rotulo="Baixo Fit (< 40)"
            corRotulo="var(--cor-texto-2)"
            corBarra="var(--cor-linha-forte, #9ca3af)"
            valor={distribuicao.baixo}
            total={distribuicao.total}
          />

          <p className="discreto" style={{ marginTop: 'var(--esp-2)' }}>
            Total de editais analisados no funil:{' '}
            <strong className="mono">{distribuicao.total}</strong>
          </p>
        </div>
      </div>
    </section>
  )
}
