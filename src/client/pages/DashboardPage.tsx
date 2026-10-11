import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ELEGIBILIDADE, MODALIDADES } from '../../shared/rotulos'

type Cartoes = {
  novosSemana: number
  aguardandoRevisao: number
  aprovadosSemInscricao: number
  prazoUrgente: number
}

type EditalUrgente = {
  id: string
  titulo: string
  orgao_financiador: string | null
  prazo_inscricao: string | null
  dias_restantes: number
  urgente: boolean
  status: string
  modalidade: string | null
}

type EditalTopFit = {
  id: string
  titulo: string
  orgao_financiador: string | null
  nota_fit: number | null
  nota_ajustada_manual: number | null
  classificacao: string | null
  modalidade: string | null
}

type Distribuicao = {
  alto: number
  medio: number
  baixo: number
  total: number
}

type SaudeFonte = {
  fonte_id: string
  nome: string
  tipo: string
  ativo: boolean
  ultima_coleta_em: string | null
  status: string
  mensagem_erro: string | null
  itens_coletados: number
}

type DashboardData = {
  cartoes: Cartoes
  editaisUrgentes: EditalUrgente[]
  topFit: EditalTopFit[]
  distribuicao: Distribuicao
  saudeColeta: SaudeFonte[]
}

export function DashboardPage() {
  const [dados, setDados] = useState<DashboardData | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    async function carregarDashboard() {
      try {
        setCarregando(true)
        setErro(null)
        const resp = await fetch('/api/dashboard')
        if (!resp.ok) {
          throw new Error('Falha ao carregar indicadores do dashboard.')
        }
        const json = await resp.json()
        setDados(json)
      } catch (err: any) {
        setErro(err.message || 'Erro inesperado ao carregar dados.')
      } finally {
        setCarregando(false)
      }
    }

    carregarDashboard()
  }, [])

  const formatarData = (iso: string | null) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleDateString('pt-BR')
  }

  const formatarDataHora = (iso: string | null) => {
    if (!iso) return 'Nunca executada'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  }

  return (
    <section>
      <header className="pagina-cabecalho">
        <div>
          <h1>Dashboard</h1>
          <p>Visão geral do funil, priorização e saúde da coleta.</p>
        </div>
        <div className="linha">
          <Link to="/editais/novo" className="btn btn--primario">
            + Nova entrada
          </Link>
          <Link to="/editais" className="btn">
            Ver todos os editais
          </Link>
        </div>
      </header>

      {erro && (
        <div className="aviso aviso--erro" role="alert">
          {erro}
        </div>
      )}

      {carregando && !dados && (
        <div className="vazio">
          <p>Carregando indicadores do sistema...</p>
        </div>
      )}

      {dados && (
        <div className="pilha pilha--lg">
          {/* 1. Quatro Cartões de Contagem com Navegação para Lista Filtrada */}
          <div className="grade-4">
            <Link
              to="/editais?novos_semana=1"
              className="contador"
              title="Clique para ver os editais novos nesta semana"
            >
              <span className="contador__rotulo">Novos esta semana</span>
              <span className="contador__valor">{dados.cartoes.novosSemana}</span>
            </Link>

            <Link
              to="/editais?status=ANALISADO,EM_REVISAO"
              className="contador"
              title="Clique para ver os editais aguardando revisão"
            >
              <span className="contador__rotulo">Aguardando revisão</span>
              <span className="contador__valor">{dados.cartoes.aguardandoRevisao}</span>
            </Link>

            <Link
              to="/editais?status=APROVADO"
              className="contador"
              title="Clique para ver os editais aprovados sem inscrição"
            >
              <span className="contador__rotulo">Aprovados sem inscrição</span>
              <span className="contador__valor">{dados.cartoes.aprovadosSemInscricao}</span>
            </Link>

            <Link
              to="/editais?prazo_urgente=1"
              className={`contador ${dados.cartoes.prazoUrgente > 0 ? 'contador--alerta' : ''}`}
              title="Clique para ver os editais com prazo em até 7 dias"
            >
              <span className="contador__rotulo">Prazo em ≤ 7 dias</span>
              <span className="contador__valor">{dados.cartoes.prazoUrgente}</span>
            </Link>
          </div>

          {/* 2. Listas dos 5 mais urgentes e 5 de maior nota de fit */}
          <div className="grade-2">
            {/* 5 Editais Mais Urgentes */}
            <section className="card">
              <div className="card__cabecalho linha linha--entre">
                <div>
                  <h2>Editais urgentes</h2>
                  <p className="discreto">5 oportunidades ativas com menor prazo restante</p>
                </div>
                <Link to="/editais?prazo_urgente=1" className="btn btn--sm btn--fantasma">
                  Ver urgentes →
                </Link>
              </div>

              <div className="card__corpo card__corpo--justo">
                {dados.editaisUrgentes.length === 0 ? (
                  <div className="vazio">Nenhum edital com prazo urgente pendente.</div>
                ) : (
                  <table className="tabela">
                    <thead>
                      <tr>
                        <th>Título</th>
                        <th>Órgão</th>
                        <th>Prazo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.editaisUrgentes.map((item) => (
                        <tr key={item.id}>
                          <td className="tabela__titulo">
                            <Link to={`/editais/${item.id}`} title={item.titulo}>
                              {item.titulo}
                            </Link>
                          </td>
                          <td className="discreto">{item.orgao_financiador || '—'}</td>
                          <td>
                            <span className={`prazo ${item.urgente ? 'prazo--urgente' : ''}`}>
                              <span className="prazo__data">{formatarData(item.prazo_inscricao)}</span>
                              <span className="prazo__restante">
                                {item.dias_restantes < 0
                                  ? 'Vencido'
                                  : item.dias_restantes === 0
                                  ? 'Hoje'
                                  : `${item.dias_restantes} dias`}
                              </span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {/* 5 Top Fit Comercial */}
            <section className="card">
              <div className="card__cabecalho linha linha--entre">
                <div>
                  <h2>Top Fit Comercial</h2>
                  <p className="discreto">5 editais elegíveis com maior nota ainda não decididos</p>
                </div>
                <Link to="/editais?elegibilidade=ELEGIVEL&faixaFit=ALTO" className="btn btn--sm btn--fantasma">
                  Ver elegíveis →
                </Link>
              </div>

              <div className="card__corpo card__corpo--justo">
                {dados.topFit.length === 0 ? (
                  <div className="vazio">Nenhum edital elegível pendente no momento.</div>
                ) : (
                  <table className="tabela">
                    <thead>
                      <tr>
                        <th>Título</th>
                        <th>Órgão</th>
                        <th>Fit Comercial</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.topFit.map((item) => {
                        const nota = item.nota_ajustada_manual ?? item.nota_fit
                        const classeFaixa =
                          nota != null && nota >= 70
                            ? 'fit--alto'
                            : nota != null && nota >= 40
                            ? 'fit--medio'
                            : nota != null
                            ? 'fit--baixo'
                            : 'fit--vazio'

                        return (
                          <tr key={item.id}>
                            <td className="tabela__titulo">
                              <Link to={`/editais/${item.id}`} title={item.titulo}>
                                {item.titulo}
                              </Link>
                            </td>
                            <td className="discreto">{item.orgao_financiador || '—'}</td>
                            <td>
                              <span className={`fit ${classeFaixa}`}>
                                <span className="fit__nota">{nota ?? '—'}</span>
                                {nota != null && (
                                  <span
                                    className="fit__barra"
                                    style={{ '--fit': nota } as React.CSSProperties}
                                  />
                                )}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>

          {/* 3. Distribuição por Classificação e Saúde da Coleta */}
          <div className="grade-2">
            {/* Distribuição por Classificação */}
            <section className="card">
              <div className="card__cabecalho">
                <h2>Distribuição por classificação</h2>
                <p className="discreto">Aderência dos editais avaliados ao perfil da I9+</p>
              </div>
              <div className="card__corpo">
                <div className="pilha">
                  <div>
                    <div className="linha linha--entre" style={{ marginBottom: 4 }}>
                      <span className="badge badge--modalidade" style={{ color: 'var(--verde-texto)' }}>
                        Alto Fit (≥ 70)
                      </span>
                      <strong className="mono">{dados.distribuicao.alto}</strong>
                    </div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 4,
                        background: 'var(--cinza-fundo)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${
                            dados.distribuicao.total > 0
                              ? Math.round((dados.distribuicao.alto / dados.distribuicao.total) * 100)
                              : 0
                          }%`,
                          background: 'var(--verde-primario, #10b981)',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="linha linha--entre" style={{ marginBottom: 4 }}>
                      <span className="badge badge--modalidade" style={{ color: 'var(--ambar-texto, #b45309)' }}>
                        Médio Fit (40–69)
                      </span>
                      <strong className="mono">{dados.distribuicao.medio}</strong>
                    </div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 4,
                        background: 'var(--cinza-fundo)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${
                            dados.distribuicao.total > 0
                              ? Math.round((dados.distribuicao.medio / dados.distribuicao.total) * 100)
                              : 0
                          }%`,
                          background: 'var(--ambar-primario, #f59e0b)',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="linha linha--entre" style={{ marginBottom: 4 }}>
                      <span className="badge badge--modalidade" style={{ color: 'var(--cor-texto-2)' }}>
                        Baixo Fit (&lt; 40)
                      </span>
                      <strong className="mono">{dados.distribuicao.baixo}</strong>
                    </div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 4,
                        background: 'var(--cinza-fundo)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${
                            dados.distribuicao.total > 0
                              ? Math.round((dados.distribuicao.baixo / dados.distribuicao.total) * 100)
                              : 0
                          }%`,
                          background: 'var(--cor-linha-forte, #9ca3af)',
                        }}
                      />
                    </div>
                  </div>

                  <p className="discreto" style={{ marginTop: 'var(--esp-2)' }}>
                    Total de editais analisados no funil:{' '}
                    <strong className="mono">{dados.distribuicao.total}</strong>
                  </p>
                </div>
              </div>
            </section>

            {/* Painel de Saúde da Coleta */}
            <section className="card">
              <div className="card__cabecalho linha linha--entre">
                <div>
                  <h2>Painel de saúde da coleta</h2>
                  <p className="discreto">Última execução e status de cada fonte monitorada</p>
                </div>
                <Link to="/fontes" className="btn btn--sm btn--fantasma">
                  Gerenciar fontes →
                </Link>
              </div>

              <div className="card__corpo card__corpo--justo">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Fonte</th>
                      <th>Situação</th>
                      <th>Última execução</th>
                      <th className="tabela__num">Coletados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.saudeColeta.map((f) => {
                      const st = f.status?.toUpperCase()
                      const statusClasse =
                        st === 'SUCESSO'
                          ? 'saude--sucesso'
                          : st === 'PARCIAL'
                          ? 'saude--parcial'
                          : st === 'FALHA'
                          ? 'saude--falha'
                          : ''

                      return (
                        <tr key={f.fonte_id}>
                          <td>
                            <strong>{f.nome}</strong>
                            <div className="discreto" style={{ fontSize: 'var(--texto-xs)' }}>
                              {f.tipo}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`saude ${statusClasse}`}
                              title={f.mensagem_erro || f.status}
                            >
                              {f.status}
                            </span>
                          </td>
                          <td className="discreto">{formatarDataHora(f.ultima_coleta_em)}</td>
                          <td className="tabela__num mono">{f.itens_coletados}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      )}
    </section>
  )
}
