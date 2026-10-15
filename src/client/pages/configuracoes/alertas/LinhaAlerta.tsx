import { CATALOGO_ALERTAS, resumoAlerta } from '../../../../shared/catalogoAlertas'
import type { ConfigAlerta } from '../../../../shared/tipos/alertas'
import { formatarDataHora } from '../../../util/formato'
import { CamposAlerta } from './CamposAlerta'

type Props = {
  config: ConfigAlerta
  aberto: boolean
  alterado: boolean
  erro: string | null
  ultimoEnvio: string | undefined
  onAbrir: () => void
  onChange: (config: ConfigAlerta) => void
}

function resumoDestinatarios(emails: string[]): string {
  if (!emails.length) return 'Todos os usuários ativos'
  return emails.length === 1 ? emails[0] : `${emails[0]} +${emails.length - 1}`
}

// Uma linha por alerta: interruptor, o que faz (com os valores atuais) e quem recebe; expande para editar.
export function LinhaAlerta({ config, aberto, alterado, erro, ultimoEnvio, onAbrir, onChange }: Props) {
  const { nome } = CATALOGO_ALERTAS[config.tipo]
  const painel = `alerta-${config.tipo}`
  const classes = ['alerta', aberto && 'alerta--aberto', !config.ativo && 'alerta--inativo', erro && 'alerta--erro']

  return (
    <li className={classes.filter(Boolean).join(' ')}>
      <div className="alerta__linha">
        <input
          type="checkbox"
          className="interruptor"
          aria-label={`${config.ativo ? 'Desativar' : 'Ativar'} ${nome}`}
          checked={config.ativo}
          onChange={(e) => onChange({ ...config, ativo: e.target.checked })}
        />
        <button type="button" className="alerta__alternar" aria-expanded={aberto} aria-controls={painel} onClick={onAbrir}>
          <span className="alerta__texto">
            <span className="alerta__titulo">
              <span className="alerta__codigo">{config.tipo}</span>
              {nome}
              {!config.ativo ? <span className="discreto">· desativado</span> : null}
              {alterado ? <span className="alerta__alterado">alterado</span> : null}
            </span>
            <span className="alerta__resumo">{erro ?? resumoAlerta(config.tipo, config.parametros)}</span>
          </span>
          <span className="alerta__meta">
            <span title={config.destinatarios.join(', ') || undefined}>{resumoDestinatarios(config.destinatarios)}</span>
            <span className="discreto">{ultimoEnvio ? `Último envio ${formatarDataHora(ultimoEnvio)}` : 'Nunca enviado'}</span>
          </span>
          <span className="alerta__seta" aria-hidden="true">›</span>
        </button>
      </div>
      {aberto ? (
        <div id={painel} className="alerta__painel">
          <CamposAlerta config={config} onChange={onChange} />
        </div>
      ) : null}
    </li>
  )
}
