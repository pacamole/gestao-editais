import { useState } from 'react'
import { edital as apiEdital } from '../../api/edital'
import { formatarDataHora } from '../../util/formato'
import { acoesPermitidas } from '../../../shared/statusEdital'
import type { AcaoRevisaoManual, Revisao, StatusEdital } from '../../../shared/tipos/edital'
import { mensagemDoServidor, type AoErro } from './util'

const BOTOES: Record<AcaoRevisaoManual, { texto: string; classe: string }> = {
  APROVOU: { texto: '✓ Aprovar', classe: 'btn btn--sucesso' },
  DESCARTOU: { texto: '✕ Descartar', classe: 'btn btn--perigo' },
  MARCOU_INSCRITO: { texto: 'Marcar como inscrito', classe: 'btn' },
  REGISTROU_RESULTADO: { texto: 'Registrar resultado', classe: 'btn' },
  REABRIU: { texto: 'Reabrir', classe: 'btn' },
  RESGATOU: { texto: 'Resgatar para análise', classe: 'btn btn--primario' },
}

type Props = {
  id: string
  status: StatusEdital
  revisoes: Revisao[]
  aoErro: AoErro
  aoAtualizar: () => Promise<void>
}

export function RevisaoHistorico({ id, status, revisoes, aoErro, aoAtualizar }: Props) {
  const [comentario, setComentario] = useState('')
  const acoes = acoesPermitidas(status)

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
          {acoes.length ? (
            <div className="linha" style={{ gap: 'var(--esp-2)' }}>
              {acoes.map((acao) => (
                <button key={acao} type="button" className={BOTOES[acao].classe} onClick={() => revisar(acao)}>
                  {BOTOES[acao].texto}
                </button>
              ))}
            </div>
          ) : (
            <p className="discreto">Este edital está encerrado: não há novas decisões a registrar.</p>
          )}

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
