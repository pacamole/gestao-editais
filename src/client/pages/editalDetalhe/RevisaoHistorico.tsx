import { useState } from 'react'
import { edital as apiEdital } from '../../api/edital'
import { formatarDataHora } from '../../util/formato'
import type { AcaoRevisaoManual, Revisao } from '../../../shared/tipos/edital'
import { mensagemDoServidor, type AoErro } from './util'

type Props = {
  id: string
  revisoes: Revisao[]
  aoErro: AoErro
  aoAtualizar: () => Promise<void>
}

export function RevisaoHistorico({ id, revisoes, aoErro, aoAtualizar }: Props) {
  const [comentario, setComentario] = useState('')

  async function revisar(acao: AcaoRevisaoManual) {
    if (acao === 'DESCARTOU' && !comentario.trim()) {
      return aoErro('Informe um comentário antes de descartar.')
    }
    aoErro('')
    try {
      await apiEdital.revisar(id, { acao, comentario })
    } catch (erro) {
      return aoErro(mensagemDoServidor(erro))
    }
    setComentario('')
    await aoAtualizar()
  }

  return (
    <div className="card detalhe-bloco">
      <div className="card__cabecalho">
        <h2>Revisão e histórico</h2>
      </div>
      <div className="card__corpo">
        <div className="pilha">
          <div className="linha" style={{ gap: 'var(--esp-2)' }}>
            <button type="button" className="btn btn--sucesso" onClick={() => revisar('APROVOU')}>
              ✓ Aprovar
            </button>
            <button type="button" className="btn btn--perigo" onClick={() => revisar('DESCARTOU')}>
              ✕ Descartar
            </button>
            <button type="button" className="btn" onClick={() => revisar('MARCOU_INSCRITO')}>
              Marcar como inscrito
            </button>
            <button type="button" className="btn" onClick={() => revisar('REGISTROU_RESULTADO')}>
              Registrar resultado
            </button>
          </div>

          <div className="campo">
            <label htmlFor="comentario-revisao">
              Comentário (obrigatório para descartar)
            </label>
            <textarea
              id="comentario-revisao"
              className="textarea"
              rows={2}
              value={comentario}
              onChange={(x) => setComentario(x.target.value)}
              placeholder="Explique a decisão ou registre uma observação."
            />
          </div>

          <div className="linha-tempo" style={{ marginTop: 'var(--esp-3)' }}>
            <h3>Linha do tempo</h3>
            {revisoes.length ? (
              revisoes.map((r) => (
                <div className="linha-tempo__item" key={r.id} style={{ padding: '4px 0' }}>
                  <strong>{r.acao.replaceAll('_', ' ')}</strong>{' '}
                  <span className="discreto mono">{formatarDataHora(r.criado_em)}</span>
                  {r.comentario && (
                    <p style={{ margin: '2px 0 0 0' }}>{r.comentario}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="discreto">
                Nenhuma revisão registrada até o momento.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
