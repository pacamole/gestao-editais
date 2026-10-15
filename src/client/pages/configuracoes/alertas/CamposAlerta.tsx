import { DIAS_SEMANA, emailValido, LIMITES_ALERTA } from '../../../../shared/catalogoAlertas'
import type { ConfigAlerta } from '../../../../shared/tipos/alertas'
import { EntradaChips } from './EntradaChips'

type Props = {
  config: ConfigAlerta
  onChange: (config: ConfigAlerta) => void
}

type CampoNumerico = keyof typeof LIMITES_ALERTA

// Parâmetros do alerta escritos como frase, cada um com o controle adequado ao seu tipo.
export function CamposAlerta({ config, onChange }: Props) {
  const p = config.parametros
  const definir = (chave: string, valor: unknown) => onChange({ ...config, parametros: { ...p, [chave]: valor } })

  // Guarda o texto digitado; a conversão e a validação ficam com normalizarParametros.
  const numero = (campo: CampoNumerico, rotulo: string) => (
    <input
      className="input alerta__numero"
      type="number"
      aria-label={rotulo}
      min={LIMITES_ALERTA[campo].min}
      max={LIMITES_ALERTA[campo].max}
      value={String(p[campo] ?? '')}
      onChange={(e) => definir(campo, e.target.value)}
    />
  )

  const id = (campo: string) => `${config.tipo}-${campo}`
  const dias = Array.isArray(p.dias_antecedencia) ? p.dias_antecedencia.map(String) : []

  return (
    <div className="pilha">
      {config.tipo === 'E01' ? (
        <p className="alerta__frase">
          Avisar quando um edital elegível tiver nota de fit a partir de {numero('nota_minima', 'Nota mínima')} (de 0 a 100).
        </p>
      ) : null}

      {config.tipo === 'E02' ? (
        <div className="campo">
          <label htmlFor={id('dias')}>Avisar quando faltarem (dias para o fim da inscrição)</label>
          <EntradaChips
            id={id('dias')}
            tipo="number"
            valores={dias}
            sufixo={(v) => (v === '1' ? 'dia' : 'dias')}
            placeholder="+ dia"
            validar={(v) => {
              const n = Number(v)
              const { min, max } = LIMITES_ALERTA.dias_antecedencia
              return Number.isInteger(n) && n >= min && n <= max ? null : `Use um número inteiro de ${min} a ${max}.`
            }}
            onChange={(valores) => definir('dias_antecedencia', valores.map(Number).sort((a, b) => b - a))}
          />
        </div>
      ) : null}

      {config.tipo === 'E03' ? (
        <p className="alerta__frase discreto">
          Sem parâmetros: dispara sempre que um edital tiver critério que não pôde ser verificado automaticamente.
        </p>
      ) : null}

      {config.tipo === 'E04' ? (
        <div className="alerta__frase">
          <span>Enviar toda</span>
          <div className="segmentado" role="radiogroup" aria-label="Dia da semana">
            {DIAS_SEMANA.map((nome, dia) => (
              <button
                key={nome}
                type="button"
                role="radio"
                aria-checked={Number(p.dia_semana) === dia}
                title={nome}
                onClick={() => definir('dia_semana', dia)}
              >
                {nome.slice(0, 3)}
              </button>
            ))}
          </div>
          <span>às</span>
          <input
            className="input alerta__hora"
            type="time"
            aria-label="Horário"
            value={String(p.hora ?? '')}
            onChange={(e) => definir('hora', e.target.value)}
          />
        </div>
      ) : null}

      {config.tipo === 'E05' ? (
        <p className="alerta__frase">
          Avisar quando a retificação mudar a nota de fit em mais de {numero('variacao_minima_nota', 'Variação mínima da nota')} pontos.
        </p>
      ) : null}

      {config.tipo === 'E06' ? (
        <p className="alerta__frase">
          Avisar depois de {numero('falhas_consecutivas', 'Falhas seguidas')} falhas seguidas da mesma fonte.
        </p>
      ) : null}

      <div className="campo">
        <label htmlFor={id('destinatarios')}>Destinatários</label>
        <EntradaChips
          id={id('destinatarios')}
          tipo="email"
          valores={config.destinatarios}
          placeholder={config.destinatarios.length ? '+ e-mail' : 'Todos os usuários ativos — digite um e-mail para restringir'}
          validar={(v) => (emailValido(v) ? null : 'E-mail inválido.')}
          onChange={(destinatarios) => onChange({ ...config, destinatarios })}
        />
        <span className="campo__ajuda">Sem e-mails na lista, o alerta vai para todos os usuários ativos.</span>
      </div>
    </div>
  )
}
