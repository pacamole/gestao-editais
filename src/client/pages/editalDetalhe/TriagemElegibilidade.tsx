import { useState } from 'react'
import { edital as apiEdital } from '../../api/edital'
import type { AnaliseElegibilidade, StatusRequisitoTriagem } from '../../../shared/tipos/triagem'
import { ELEGIBILIDADE, resumoDaElegibilidade } from '../../../shared/rotulos'
import { NAO_LOCALIZADO, SEM_CONEXAO, mensagemDoServidor, type AoErro } from './util'

const ROTULOS: Record<StatusRequisitoTriagem, string> = {
  ATENDE: 'Atende',
  NAO_ATENDE: 'Não atende',
  INDETERMINADO: 'Não determinado',
}

type Props = {
  id: string
  analise: AnaliseElegibilidade | null
  podeAnalisar: boolean
  aoErro: AoErro
  aoAtualizar: () => Promise<void>
}

export function TriagemElegibilidade({ id, analise, podeAnalisar, aoErro, aoAtualizar }: Props) {
  const [analisando, setAnalisando] = useState(false)

  async function analisar() {
    if (analisando) return
    setAnalisando(true)
    aoErro('')
    try {
      await apiEdital.analisarElegibilidade(id)
      await aoAtualizar()
    } catch (erro) {
      aoErro(mensagemDoServidor(erro) || SEM_CONEXAO)
    } finally {
      setAnalisando(false)
    }
  }

  return (
    <div className="card detalhe-bloco">
      <div className="card__cabecalho linha linha--entre">
        <div>
          <h2>Triagem de elegibilidade</h2>
          <small className="discreto">Compara os requisitos do edital com o perfil e o site cadastrado da empresa.</small>
        </div>
        <button
          type="button"
          className="btn btn--primario"
          onClick={() => void analisar()}
          disabled={analisando || !podeAnalisar}
          title={!podeAnalisar ? 'O edital ainda não tem texto nem endereço para leitura.' : undefined}
        >
          {analisando ? 'Analisando...' : 'Analisar elegibilidade'}
        </button>
      </div>
      {analise ? (
        <div className="card__corpo">
          <p><strong>Resultado: {ELEGIBILIDADE[analise.status]}</strong></p>
          <p>{resumoDaElegibilidade(analise.status)}</p>
          {analise.aviso_leitura && <p className="aviso">{analise.aviso_leitura}</p>}
          <p className="discreto">
            Páginas do site lidas: {analise.paginas_site_lidas}; incluídas no contexto da IA: {analise.paginas_site_enviadas}.
            {' '}Análise em {new Date(analise.criado_em).toLocaleString('pt-BR')}.
          </p>
          <div className="pilha">
            {analise.requisitos.map((requisito, indice) => (
              <article className="card" key={`${indice}-${requisito.pergunta}`}>
                <div className="card__corpo">
                  <h3>{requisito.pergunta}</h3>
                  <p><strong>{ROTULOS[requisito.status]}</strong></p>
                  <p><strong>Dados cadastrados da empresa:</strong> {requisito.comparativo_perfil || NAO_LOCALIZADO}</p>
                  <p><strong>Informações encontradas no site:</strong> {requisito.comparativo_site || NAO_LOCALIZADO}</p>
                  {(requisito.fontes_site ?? []).length > 0 && (
                    <p>
                      <strong>Páginas do site usadas como fonte:</strong>{' '}
                      {(requisito.fontes_site ?? []).map((url, fonteIndice) => (
                        <span key={url}>
                          {fonteIndice > 0 ? ', ' : ''}
                          <a href={url} target="_blank" rel="noopener noreferrer" title={url}>
                            {new URL(url).host}{new URL(url).pathname}
                          </a>
                        </span>
                      ))}
                    </p>
                  )}
                  {requisito.evidencia_edital && <p><strong>Trecho do edital:</strong> “{requisito.evidencia_edital}”</p>}
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
