import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { edital as apiEdital } from '../api/edital'
import { rotuloValor } from '../util/formato'
import type { DetalheEditalResposta } from '../../shared/tipos/edital'
import { ChatEdital } from './editalDetalhe/ChatEdital'
import { DadosExtraidos } from './editalDetalhe/DadosExtraidos'
import { RevisaoHistorico } from './editalDetalhe/RevisaoHistorico'
import { Veredito } from './editalDetalhe/Veredito'
import { NAO_LOCALIZADO, mensagemDoServidor } from './editalDetalhe/util'

// Tarefas 10 e 11 — leitura de dados reais e revisão persistida.
export function EditalDetalhePage() {
  const { id = '' } = useParams()
  const [dados, setDados] = useState<DetalheEditalResposta | null>(null)
  const [erro, setErro] = useState('')

  // Não lança: falhas viram o aviso de erro da página.
  const carregar = useCallback(async () => {
    try {
      setDados(await apiEdital.obter(id))
    } catch (erroCarga) {
      setErro(mensagemDoServidor(erroCarga))
    }
  }, [id])

  useEffect(() => {
    void carregar()
  }, [carregar])

  if (erro && !dados) {
    return (
      <section>
        <Link to="/editais">← Editais</Link>
        <div className="aviso aviso--erro" role="alert" style={{ marginTop: 'var(--esp-3)' }}>
          {erro}
        </div>
      </section>
    )
  }

  if (!dados) return <p className="vazio">Carregando edital...</p>

  const { edital: e, avaliacao, evidencias = [], revisoes = [] } = dados
  const textoDisponivel = Boolean(e.texto_extraido?.trim())

  return (
    <section className="detalhe pilha pilha--lg">
      <Link to="/editais" className="discreto">
        ← Voltar para editais
      </Link>
      <header className="pagina-cabecalho">
        <div>
          <h1>{e.titulo}</h1>
          <p>
            {rotuloValor(e.orgao_financiador, NAO_LOCALIZADO)} · {rotuloValor(e.numero_edital, NAO_LOCALIZADO)}
          </p>
        </div>
        <span className={`status status--${String(e.status).toLowerCase()}`}>
          {e.status}
        </span>
      </header>

      {erro && (
        <div className="aviso aviso--erro" role="alert">
          {erro}
        </div>
      )}

      <Veredito avaliacao={avaliacao} />
      <DadosExtraidos
        id={id}
        edital={e}
        evidencias={evidencias}
        textoDisponivel={textoDisponivel}
        aoErro={setErro}
        aoAtualizar={carregar}
      />
      <RevisaoHistorico id={id} revisoes={revisoes} aoErro={setErro} aoAtualizar={carregar} />
      <ChatEdital id={id} textoDisponivel={textoDisponivel} aoErro={setErro} />
    </section>
  )
}
