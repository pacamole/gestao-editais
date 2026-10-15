import { useState } from 'react'
import type { TipoNotificacao } from '../../../../shared/tipos/alertas'
import { alertas } from '../../../api/alertas'
import { mensagemDeErro } from '../../../api/cliente'

type Props = {
  tipo: TipoNotificacao
  destinatarios: string[] // os da tela, mesmo ainda não salvos; vazio = toda a lista
}

type Aviso = { tipo: 'sucesso' | 'atencao' | 'erro'; texto: string } | null

const pessoas = (n: number) => (n === 1 ? '1 e-mail' : `${n} e-mails`)

// Envia agora um e-mail do tipo com dados fictícios, sem passar pelo anti-spam nem gravar no histórico.
export function SimularEnvio({ tipo, destinatarios }: Props) {
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<Aviso>(null)

  async function simular() {
    setEnviando(true)
    setAviso(null)
    try {
      const r = await alertas.simular(tipo, destinatarios)
      if (r.falhas.length) {
        setAviso({ tipo: 'erro', texto: `Falhou para ${r.falhas.join(', ')}${r.enviados.length ? `; enviada para ${pessoas(r.enviados.length)}` : ''}.` })
      } else if (!r.smtp_ativo) {
        setAviso({ tipo: 'atencao', texto: `SMTP desligado: a simulação ${tipo} foi impressa no terminal do servidor (${pessoas(r.enviados.length)}).` })
      } else {
        setAviso({ tipo: 'sucesso', texto: `Simulação ${tipo} enviada para ${pessoas(r.enviados.length)}.` })
      }
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e, 'Não foi possível simular.') })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="alerta__simular">
      <div className="linha">
        <button type="button" className="btn" onClick={simular} disabled={enviando}>
          {enviando ? 'Enviando…' : '▷ Simular envio'}
        </button>
        <span className="discreto">Envia agora um e-mail {tipo} com dados fictícios para os destinatários acima.</span>
      </div>
      {aviso ? <p className={`aviso aviso--${aviso.tipo}`} role="status">{aviso.texto}</p> : null}
    </div>
  )
}
