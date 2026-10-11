import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

type Dados = { edital: any; avaliacao: any; evidencias: any[]; revisoes: any[] }
type Msg = { id: string; papel: 'USUARIO' | 'ASSISTENTE'; conteudo: string }

const rotulo = (v: unknown) =>
  v == null || v === ''
    ? 'Não localizado no documento'
    : Array.isArray(v)
    ? v.length
      ? v.join(', ')
      : 'Sem restrição'
    : typeof v === 'boolean'
    ? v
      ? 'Sim'
      : 'Não'
    : String(v)

const data = (v: string | null) =>
  v ? new Date(v).toLocaleDateString('pt-BR') : 'Não localizado no documento'

const dinheiro = (v: number | null) =>
  v == null
    ? 'Não localizado no documento'
    : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function EditalDetalhePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro] = useState('')
  const [comentario, setComentario] = useState('')
  const [mensagens, setMensagens] = useState<Msg[]>([])
  const [pergunta, setPergunta] = useState('')
  const [restantes, setRestantes] = useState(20)
  const [enviando, setEnviando] = useState(false)

  async function carregar() {
    const r = await fetch(`/api/editais/${id}`)
    if (r.status === 401) return navigate('/login')
    const j = await r.json()
    if (!r.ok) return setErro(j.erro ?? 'Erro ao carregar edital.')
    setDados(j)
    const c = await fetch(`/api/editais/${id}/chat`)
    if (c.ok) {
      const cj = await c.json()
      setMensagens(cj.mensagens || [])
      setRestantes(cj.restantes ?? 20)
    }
  }

  useEffect(() => {
    carregar().catch(() => setErro('Não foi possível conectar ao servidor.'))
  }, [id])

  async function revisar(acao: string) {
    if (acao === 'DESCARTOU' && !comentario.trim()) {
      return setErro('Informe um comentário antes de descartar.')
    }
    setErro('')
    const r = await fetch(`/api/editais/${id}/revisao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao, comentario }),
    })
    const j = await r.json()
    if (!r.ok) return setErro(j.erro ?? 'Não foi possível registrar a ação.')
    setComentario('')
    await carregar()
  }

  async function enviar(e?: FormEvent, sugerida?: string) {
    e?.preventDefault()
    const texto = (sugerida ?? pergunta).trim()
    if (!texto || enviando) return
    setEnviando(true)
    setErro('')
    const r = await fetch(`/api/editais/${id}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pergunta: texto }),
    })
    const j = await r.json()
    if (r.ok) {
      setMensagens(j.mensagens || [])
      setPergunta('')
      setRestantes((x) => Math.max(0, x - 1))
    } else {
      setErro(j.erro ?? 'Erro no chat.')
    }
    setEnviando(false)
  }

  async function limpar() {
    await fetch(`/api/editais/${id}/chat`, { method: 'DELETE' })
    setMensagens([])
    setRestantes(20)
  }

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

  const { edital: e, avaliacao: a, evidencias = [], revisoes = [] } = dados
  const campos: [string, string, unknown][] = [
    ['Órgão financiador', 'orgao_financiador', e.orgao_financiador],
    ['Número', 'numero_edital', e.numero_edital],
    ['Modalidade', 'modalidade', e.modalidade],
    ['Publicação', 'data_publicacao', data(e.data_publicacao)],
    ['Prazo', 'prazo_inscricao', data(e.prazo_inscricao)],
    ['Valor total', 'valor_total_disponivel', dinheiro(e.valor_total_disponivel)],
    ['Valor máximo/projeto', 'valor_maximo_por_projeto', dinheiro(e.valor_maximo_por_projeto)],
    ['Exige contrapartida', 'exige_contrapartida', rotulo(e.exige_contrapartida)],
    ['Contrapartida (%)', 'percentual_contrapartida', e.percentual_contrapartida],
    ['Público-alvo', 'publico_alvo', e.publico_alvo],
    ['CNAEs aceitos', 'cnaes_aceitos', e.cnaes_aceitos],
    ['Portes aceitos', 'portes_aceitos', e.portes_aceitos],
    ['Abrangência', 'abrangencia_geografica', e.abrangencia_geografica],
    ['Áreas temáticas', 'areas_tematicas', e.areas_tematicas],
    ['Resumo executivo', 'resumo_executivo', e.resumo_executivo],
  ]

  return (
    <section className="detalhe pilha pilha--lg">
      <Link to="/editais" className="discreto">
        ← Voltar para editais
      </Link>
      <header className="pagina-cabecalho">
        <div>
          <h1>{e.titulo}</h1>
          <p>
            {rotulo(e.orgao_financiador)} · {rotulo(e.numero_edital)}
          </p>
        </div>
        <span className={`status status--${String(e.status).toLowerCase()}`}>{e.status}</span>
      </header>

      {erro && (
        <div className="aviso aviso--erro" role="alert">
          {erro}
        </div>
      )}

      {/* Veredito */}
      <div className="card detalhe-bloco">
        <div className="card__cabecalho">
          <h2>Veredito</h2>
        </div>
        <div className="card__corpo">
          {!a ? (
            <p className="discreto">A avaliação automática ainda não foi registrada.</p>
          ) : (
            <div className="pilha">
              <div className="linha" style={{ gap: 'var(--esp-3)' }}>
                <span className={`badge badge--${a.status_elegibilidade.toLowerCase()}`}>
                  {a.status_elegibilidade === 'ELEGIVEL'
                    ? '✓ Elegível'
                    : a.status_elegibilidade === 'INELEGIVEL'
                    ? '✕ Inelegível'
                    : '? Indeterminado'}
                </span>
                {a.status_elegibilidade === 'ELEGIVEL' && (
                  <div className="fit">
                    <strong className="fit__nota">{a.nota_ajustada_manual ?? a.nota_fit ?? '—'}</strong>
                    <span className="discreto">Fit / 100 · {a.classificacao ?? 'sem faixa'}</span>
                  </div>
                )}
              </div>

              {a.criterios_violados?.length > 0 && (
                <ul className="pendencias" style={{ marginTop: 'var(--esp-2)' }}>
                  {a.criterios_violados.map((x: any) => (
                    <li key={x.criterio_id}>
                      <strong>{x.nome}:</strong> {x.motivo}
                    </li>
                  ))}
                </ul>
              )}

              {a.criterios_indeterminados?.length > 0 && (
                <ul className="pendencias" style={{ marginTop: 'var(--esp-2)' }}>
                  {a.criterios_indeterminados.map((x: any) => (
                    <li key={x.criterio_id}>
                      <strong>{x.nome}:</strong> verificar manualmente — {x.campo_faltante}
                    </li>
                  ))}
                </ul>
              )}

              {a.detalhamento_pontuacao?.length > 0 && (
                <table className="tabela" style={{ marginTop: 'var(--esp-2)' }}>
                  <thead>
                    <tr>
                      <th>Critério</th>
                      <th>Peso</th>
                      <th>Pontuação</th>
                      <th>Contribuição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.detalhamento_pontuacao.map((x: any) => (
                      <tr key={x.criterio_id}>
                        <td>{x.criterio_id}</td>
                        <td className="mono">{x.peso}</td>
                        <td className="mono">{x.pontuacao}</td>
                        <td className="mono">{x.contribuicao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dados Extraídos */}
      <div className="card detalhe-bloco">
        <div className="card__cabecalho">
          <h2>Dados extraídos</h2>
        </div>
        <div className="card__corpo card__corpo--justo">
          <table className="tabela">
            <thead>
              <tr>
                <th>Campo</th>
                <th>Valor</th>
                <th>Evidência</th>
              </tr>
            </thead>
            <tbody>
              {campos.map(([nome, campo, valor]) => {
                const ev = evidencias.find((x: any) => x.campo === campo)
                return (
                  <tr key={campo}>
                    <td>
                      <strong>{nome}</strong>
                    </td>
                    <td>{rotulo(valor)}</td>
                    <td>
                      {ev ? (
                        <details>
                          <summary className="discreto">Ver trecho</summary>
                          <p style={{ marginTop: 4, fontStyle: 'italic' }}>
                            “{ev.trecho_literal}” {ev.pagina ? `— pág. ${ev.pagina}` : ''}
                          </p>
                        </details>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revisão e Histórico */}
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
              <label htmlFor="comentario-revisao">Comentário (obrigatório para descartar)</label>
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
                revisoes.map((r: any) => (
                  <div className="linha-tempo__item" key={r.id} style={{ padding: '4px 0' }}>
                    <strong>{r.acao.replaceAll('_', ' ')}</strong>{' '}
                    <span className="discreto mono">{new Date(r.criado_em).toLocaleString('pt-BR')}</span>
                    {r.comentario && <p style={{ margin: '2px 0 0 0' }}>{r.comentario}</p>}
                  </div>
                ))
              ) : (
                <p className="discreto">Nenhuma revisão registrada até o momento.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat sobre o edital */}
      <div className="card detalhe-bloco">
        <div className="card__cabecalho linha linha--entre">
          <div>
            <h2>Chat sobre o edital</h2>
            <small className="discreto">{restantes} perguntas restantes nesta sessão</small>
          </div>
          <button type="button" className="btn btn--sm btn--fantasma" onClick={limpar}>
            Limpar conversa
          </button>
        </div>
        <div className="card__corpo">
          <div className="pilha">
            <div className="chat-historico">
              {!mensagens.length && (
                <div className="chat-sugestoes">
                  <p className="discreto">Perguntas sugeridas:</p>
                  <div className="linha" style={{ gap: 'var(--esp-2)', marginTop: 4 }}>
                    {[
                      'Qual é o prazo de inscrição?',
                      'Qual é o valor máximo por projeto?',
                      'O edital exige contrapartida?',
                    ].map((q) => (
                      <button
                        type="button"
                        className="btn btn--sm"
                        key={q}
                        onClick={() => enviar(undefined, q)}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {mensagens.map((m) => (
                <div
                  key={m.id}
                  className={`chat-msg chat-msg--${m.papel.toLowerCase()}`}
                  style={{
                    padding: '8px 12px',
                    margin: '6px 0',
                    borderRadius: 'var(--raio-2)',
                    background:
                      m.papel === 'USUARIO' ? 'var(--cor-primaria-suave)' : 'var(--cinza-fundo)',
                  }}
                >
                  <strong>{m.papel === 'USUARIO' ? 'Você' : 'Assistente'}</strong>
                  <p style={{ margin: '4px 0 0 0' }}>{m.conteudo}</p>
                </div>
              ))}
            </div>

            <form onSubmit={enviar} className="linha" style={{ marginTop: 'var(--esp-2)' }}>
              <input
                className="input"
                style={{ flex: 1 }}
                value={pergunta}
                onChange={(x) => setPergunta(x.target.value)}
                placeholder="Pergunte sobre este edital..."
                disabled={enviando}
              />
              <button
                type="submit"
                className="btn btn--primario"
                disabled={enviando || !pergunta.trim()}
              >
                {enviando ? 'Enviando...' : 'Enviar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
