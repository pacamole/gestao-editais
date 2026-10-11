import { useEffect, useState, useTransition } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  ELEGIBILIDADE,
  MODALIDADES,
  STATUS_EDITAL,
} from '../../shared/rotulos'

type ItemEdital = {
  id: string
  titulo: string
  orgao_financiador: string | null
  numero_edital: string | null
  modalidade: string | null
  prazo_inscricao: string | null
  valor_maximo_por_projeto: number | null
  status: string
  fonte_nome: string | null
  status_elegibilidade: string | null
  nota_fit: number | null
  nota_ajustada_manual: number | null
  classificacao: string | null
  dias_restantes: number | null
  prazo_urgente: boolean
}

type RespostaEditais = {
  itens: ItemEdital[]
  total: number
  pagina: number
  limite: number
  totalPaginas: number
}

type FonteItem = {
  id: string
  nome: string
}

export function EditaisPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Filtros derivados da URL ou padrão
  const [busca, setBusca] = useState(searchParams.get('busca') ?? '')
  const [status, setStatus] = useState(searchParams.get('status') ?? 'TODOS')
  const [elegibilidade, setElegibilidade] = useState(searchParams.get('elegibilidade') ?? 'TODAS')
  const [faixaFit, setFaixaFit] = useState(searchParams.get('faixaFit') ?? 'TODAS')
  const [modalidade, setModalidade] = useState(searchParams.get('modalidade') ?? 'TODAS')
  const [fonteId, setFonteId] = useState(searchParams.get('fonte_id') ?? 'TODAS')
  const [prazoDe, setPrazoDe] = useState(searchParams.get('prazoDe') ?? '')
  const [prazoAte, setPrazoAte] = useState(searchParams.get('prazoAte') ?? '')
  const [somentePrazoAberto, setSomentePrazoAberto] = useState(
    searchParams.get('somentePrazoAberto') === '1'
  )
  const [novosSemana, setNovosSemana] = useState(searchParams.get('novos_semana') === '1')
  const [prazoUrgente, setPrazoUrgente] = useState(searchParams.get('prazo_urgente') === '1')

  const [pagina, setPagina] = useState(Number(searchParams.get('pagina') ?? 1))
  const [limite] = useState(10)

  const [dados, setDados] = useState<RespostaEditais | null>(null)
  const [fontes, setFontes] = useState<FonteItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  // Seleção de linhas para ações em lote
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [descarteModalAberto, setDescarteModalAberto] = useState(false)
  const [justificativaDescarte, setJustificativaDescarte] = useState('')
  const [executandoLote, setExecutandoLote] = useState(false)

  // Carrega lista de fontes disponíveis para o dropdown
  useEffect(() => {
    async function carregarFontes() {
      try {
        const resp = await fetch('/api/fontes')
        if (resp.ok) {
          const json = await resp.json()
          setFontes(json.fontes || [])
        }
      } catch {}
    }
    carregarFontes()
  }, [])

  // Atualiza estado quando parâmetros de URL mudam (ex: navegação vinda do dashboard)
  useEffect(() => {
    if (searchParams.has('status')) setStatus(searchParams.get('status')!)
    if (searchParams.has('novos_semana')) setNovosSemana(searchParams.get('novos_semana') === '1')
    if (searchParams.has('prazo_urgente')) setPrazoUrgente(searchParams.get('prazo_urgente') === '1')
    if (searchParams.has('elegibilidade')) setElegibilidade(searchParams.get('elegibilidade')!)
    if (searchParams.has('faixaFit')) setFaixaFit(searchParams.get('faixaFit')!)
  }, [searchParams])

  // Busca dados na API sempre que um filtro ou página muda
  async function carregarEditais() {
    try {
      setCarregando(true)
      setErro(null)

      const params = new URLSearchParams()
      if (busca.trim()) params.set('busca', busca.trim())
      if (status !== 'TODOS') params.set('status', status)
      if (elegibilidade !== 'TODAS') params.set('elegibilidade', elegibilidade)
      if (faixaFit !== 'TODAS') params.set('faixaFit', faixaFit)
      if (modalidade !== 'TODAS') params.set('modalidade', modalidade)
      if (fonteId !== 'TODAS') params.set('fonte_id', fonteId)
      if (prazoDe) params.set('prazoDe', prazoDe)
      if (prazoAte) params.set('prazoAte', prazoAte)
      if (somentePrazoAberto) params.set('somentePrazoAberto', '1')
      if (novosSemana) params.set('novosSemana', '1')
      if (prazoUrgente) params.set('prazoUrgente', '1')

      params.set('pagina', String(pagina))
      params.set('limite', String(limite))

      const resp = await fetch(`/api/editais?${params.toString()}`)
      if (!resp.ok) throw new Error('Não foi possível carregar os editais.')

      const json: RespostaEditais = await resp.json()
      setDados(json)
      // Limpa seleções que não estão mais na página
      setSelecionados([])
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar dados.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarEditais()
  }, [
    busca,
    status,
    elegibilidade,
    faixaFit,
    modalidade,
    fonteId,
    prazoDe,
    prazoAte,
    somentePrazoAberto,
    novosSemana,
    prazoUrgente,
    pagina,
  ])

  // Manipulação de seleção para lote
  const toggleSelecionarTudo = () => {
    if (!dados?.itens) return
    if (selecionados.length === dados.itens.length) {
      setSelecionados([])
    } else {
      setSelecionados(dados.itens.map((i) => i.id))
    }
  }

  const toggleItem = (id: string) => {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  // Ação em lote: Aprovar
  async function aprovarLote() {
    if (!selecionados.length || executandoLote) return
    try {
      setExecutandoLote(true)
      setErro(null)
      const resp = await fetch('/api/editais/lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selecionados, acao: 'APROVAR' }),
      })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.erro || 'Erro ao aprovar editais em lote.')

      setSucesso(`${selecionados.length} edital(is) aprovado(s) com sucesso.`)
      setTimeout(() => setSucesso(null), 4000)
      await carregarEditais()
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setExecutandoLote(false)
    }
  }

  // Ação em lote: Descartar com justificativa obrigatória
  async function confirmarDescarteLote() {
    if (!justificativaDescarte.trim()) {
      setErro('Informe uma justificativa para o descarte em lote.')
      return
    }

    try {
      setExecutandoLote(true)
      setErro(null)
      const resp = await fetch('/api/editais/lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selecionados,
          acao: 'DESCARTAR',
          comentario: justificativaDescarte.trim(),
        }),
      })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.erro || 'Erro ao descartar editais em lote.')

      setSucesso(`${selecionados.length} edital(is) descartado(s) com sucesso.`)
      setTimeout(() => setSucesso(null), 4000)
      setDescarteModalAberto(false)
      setJustificativaDescarte('')
      await carregarEditais()
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setExecutandoLote(false)
    }
  }

  // Exportação CSV da visão filtrada
  function exportarCsv() {
    const params = new URLSearchParams()
    if (busca.trim()) params.set('busca', busca.trim())
    if (status !== 'TODOS') params.set('status', status)
    if (elegibilidade !== 'TODAS') params.set('elegibilidade', elegibilidade)
    if (faixaFit !== 'TODAS') params.set('faixaFit', faixaFit)
    if (modalidade !== 'TODAS') params.set('modalidade', modalidade)
    if (fonteId !== 'TODAS') params.set('fonte_id', fonteId)
    if (prazoDe) params.set('prazoDe', prazoDe)
    if (prazoAte) params.set('prazoAte', prazoAte)
    if (somentePrazoAberto) params.set('somentePrazoAberto', '1')
    if (novosSemana) params.set('novosSemana', '1')
    if (prazoUrgente) params.set('prazoUrgente', '1')
    params.set('formato', 'csv')

    window.open(`/api/editais?${params.toString()}`, '_blank')
  }

  // Limpar todos os filtros
  function limparFiltros() {
    setBusca('')
    setStatus('TODOS')
    setElegibilidade('TODAS')
    setFaixaFit('TODAS')
    setModalidade('TODAS')
    setFonteId('TODAS')
    setPrazoDe('')
    setPrazoAte('')
    setSomentePrazoAberto(false)
    setNovosSemana(false)
    setPrazoUrgente(false)
    setPagina(1)
    setSearchParams({})
  }

  const formatarValor = (valor: number | null) => {
    if (valor == null) return '—'
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const formatarData = (iso: string | null) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleDateString('pt-BR')
  }

  const inicioRegistro = dados ? (pagina - 1) * limite + 1 : 0
  const fimRegistro = dados ? Math.min(pagina * limite, dados.total) : 0

  return (
    <section>
      <header className="pagina-cabecalho">
        <div>
          <h1>Editais</h1>
          <p>
            {dados ? `${dados.total} oportunidades cadastradas` : 'Carregando...'} · ordenados por
            elegibilidade, nota de fit e prazo
          </p>
        </div>
        <div className="linha">
          <button className="btn" onClick={exportarCsv} title="Exportar planilha CSV da visão filtrada">
            Exportar CSV
          </button>
          <Link className="btn btn--primario" to="/editais/novo">
            + Nova entrada
          </Link>
        </div>
      </header>

      {sucesso && (
        <div className="aviso aviso--sucesso" role="status" style={{ marginBottom: 'var(--esp-4)' }}>
          {sucesso}
        </div>
      )}

      {erro && (
        <div className="aviso aviso--erro" role="alert" style={{ marginBottom: 'var(--esp-4)' }}>
          {erro}
        </div>
      )}

      {/* Barra de Filtros Combinados (Tarefa 12) */}
      <div className="card" style={{ marginBottom: 'var(--esp-4)' }}>
        <div className="filtros">
          {/* Busca textual por título ou órgão */}
          <div className="campo campo--busca">
            <label htmlFor="filtro-busca">Busca por texto</label>
            <input
              id="filtro-busca"
              type="text"
              className="input"
              placeholder="Buscar título, órgão financiador ou número..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value)
                setPagina(1)
              }}
            />
          </div>

          {/* Status */}
          <div className="campo">
            <label htmlFor="filtro-status">Status</label>
            <select
              id="filtro-status"
              className="select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPagina(1)
              }}
            >
              <option value="TODOS">Todos os status</option>
              {Object.entries(STATUS_EDITAL).map(([chave, rotulo]) => (
                <option key={chave} value={chave}>
                  {rotulo}
                </option>
              ))}
            </select>
          </div>

          {/* Elegibilidade */}
          <div className="campo">
            <label htmlFor="filtro-elegibilidade">Elegibilidade</label>
            <select
              id="filtro-elegibilidade"
              className="select"
              value={elegibilidade}
              onChange={(e) => {
                setElegibilidade(e.target.value)
                setPagina(1)
              }}
            >
              <option value="TODAS">Todas</option>
              <option value="ELEGIVEL">Elegível</option>
              <option value="INDETERMINADO">Indeterminado</option>
              <option value="INELEGIVEL">Inelegível</option>
            </select>
          </div>

          {/* Faixa de Nota de Fit */}
          <div className="campo">
            <label htmlFor="filtro-fit">Faixa de Nota</label>
            <select
              id="filtro-fit"
              className="select"
              value={faixaFit}
              onChange={(e) => {
                setFaixaFit(e.target.value)
                setPagina(1)
              }}
            >
              <option value="TODAS">Todas as faixas</option>
              <option value="ALTO">Alto fit (≥ 70)</option>
              <option value="MEDIO">Médio fit (40–69)</option>
              <option value="BAIXO">Baixo fit (&lt; 40)</option>
            </select>
          </div>

          {/* Modalidade */}
          <div className="campo">
            <label htmlFor="filtro-modalidade">Modalidade</label>
            <select
              id="filtro-modalidade"
              className="select"
              value={modalidade}
              onChange={(e) => {
                setModalidade(e.target.value)
                setPagina(1)
              }}
            >
              <option value="TODAS">Todas</option>
              {Object.entries(MODALIDADES).map(([chave, rotulo]) => (
                <option key={chave} value={chave}>
                  {rotulo}
                </option>
              ))}
            </select>
          </div>

          {/* Fonte */}
          <div className="campo">
            <label htmlFor="filtro-fonte">Fonte</label>
            <select
              id="filtro-fonte"
              className="select"
              value={fonteId}
              onChange={(e) => {
                setFonteId(e.target.value)
                setPagina(1)
              }}
            >
              <option value="TODAS">Todas as fontes</option>
              {fontes.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Intervalo de Prazo: De */}
          <div className="campo" style={{ minWidth: 130 }}>
            <label htmlFor="filtro-prazo-de">Prazo de</label>
            <input
              id="filtro-prazo-de"
              type="date"
              className="input"
              value={prazoDe}
              onChange={(e) => {
                setPrazoDe(e.target.value)
                setPagina(1)
              }}
            />
          </div>

          {/* Intervalo de Prazo: Até */}
          <div className="campo" style={{ minWidth: 130 }}>
            <label htmlFor="filtro-prazo-ate">Prazo até</label>
            <input
              id="filtro-prazo-ate"
              type="date"
              className="input"
              value={prazoAte}
              onChange={(e) => {
                setPrazoAte(e.target.value)
                setPagina(1)
              }}
            />
          </div>

          {/* Opções Booleanas Rápidas */}
          <div className="linha" style={{ paddingBottom: 6 }}>
            <label className="checkbox" title="Filtrar editais cujo prazo de inscrição ainda não expirou">
              <input
                type="checkbox"
                checked={somentePrazoAberto}
                onChange={(e) => {
                  setSomentePrazoAberto(e.target.checked)
                  setPagina(1)
                }}
              />
              Prazo aberto
            </label>

            <button className="btn btn--sm btn--fantasma" onClick={limparFiltros} title="Limpar todos os filtros">
              Limpar filtros
            </button>
          </div>
        </div>

        {/* Barra de Ações em Lote (aparece quando itens são selecionados) */}
        {selecionados.length > 0 && (
          <div className="lote linha linha--entre">
            <span style={{ fontWeight: 600 }}>
              {selecionados.length} {selecionados.length === 1 ? 'edital selecionado' : 'editais selecionados'}
            </span>
            <div className="linha">
              <button
                className="btn btn--sucesso btn--sm"
                onClick={aprovarLote}
                disabled={executandoLote}
              >
                ✓ Aprovar selecionados
              </button>
              <button
                className="btn btn--perigo btn--sm"
                onClick={() => setDescarteModalAberto(true)}
                disabled={executandoLote}
              >
                ✕ Descartar selecionados
              </button>
              <button
                className="btn btn--sm btn--fantasma"
                onClick={() => setSelecionados([])}
              >
                Cancelar seleção
              </button>
            </div>
          </div>
        )}

        {/* Modal/Área de justificativa obrigatória para descarte em lote */}
        {descarteModalAberto && (
          <div
            style={{
              padding: 'var(--esp-4)',
              background: 'var(--vermelho-fundo, #fee2e2)',
              borderBottom: '1px solid var(--cor-linha)',
            }}
          >
            <div className="pilha">
              <strong style={{ color: 'var(--vermelho-texto, #991b1b)' }}>
                Justificativa para descarte em lote de {selecionados.length} edital(is):
              </strong>
              <div className="campo">
                <textarea
                  className="textarea"
                  placeholder="Informe o motivo do descarte (obrigatório pela política de revisão)..."
                  value={justificativaDescarte}
                  onChange={(e) => setJustificativaDescarte(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="linha">
                <button
                  className="btn btn--perigo btn--sm"
                  onClick={confirmarDescarteLote}
                  disabled={executandoLote || !justificativaDescarte.trim()}
                >
                  {executandoLote ? 'Descartando...' : 'Confirmar descarte'}
                </button>
                <button
                  className="btn btn--sm"
                  onClick={() => {
                    setDescarteModalAberto(false)
                    setJustificativaDescarte('')
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabela Paginada de Editais */}
        <div className="card__corpo card__corpo--justo">
          {carregando && !dados ? (
            <div className="vazio">Carregando lista de editais...</div>
          ) : !dados || dados.itens.length === 0 ? (
            <div className="vazio">
              Nenhum edital encontrado com a combinação de filtros selecionada.
            </div>
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th className="tabela__selecao">
                    <input
                      type="checkbox"
                      aria-label="Selecionar todos os editais desta página"
                      checked={
                        dados.itens.length > 0 &&
                        selecionados.length === dados.itens.length
                      }
                      onChange={toggleSelecionarTudo}
                    />
                  </th>
                  <th>Título</th>
                  <th>Órgão</th>
                  <th>Modalidade</th>
                  <th>Prazo</th>
                  <th className="tabela__num">Valor Máximo</th>
                  <th>Elegibilidade</th>
                  <th>Nota de Fit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dados.itens.map((item) => {
                  const nota = item.nota_ajustada_manual ?? item.nota_fit
                  const classeFit =
                    nota != null && nota >= 70
                      ? 'fit--alto'
                      : nota != null && nota >= 40
                      ? 'fit--medio'
                      : nota != null
                      ? 'fit--baixo'
                      : 'fit--vazio'

                  const eleg = item.status_elegibilidade?.toUpperCase()
                  const classeEleg =
                    eleg === 'ELEGIVEL'
                      ? 'badge--elegivel'
                      : eleg === 'INELEGIVEL'
                      ? 'badge--inelegivel'
                      : eleg === 'INDETERMINADO'
                      ? 'badge--indeterminado'
                      : ''

                  return (
                    <tr key={item.id}>
                      <td className="tabela__selecao">
                        <input
                          type="checkbox"
                          aria-label={`Selecionar edital ${item.titulo}`}
                          checked={selecionados.includes(item.id)}
                          onChange={() => toggleItem(item.id)}
                        />
                      </td>

                      <td className="tabela__titulo">
                        <Link to={`/editais/${item.id}`} title={item.titulo}>
                          {item.titulo}
                        </Link>
                        {item.numero_edital && (
                          <div className="discreto" style={{ fontSize: 'var(--texto-xs)' }}>
                            Edital nº {item.numero_edital}
                          </div>
                        )}
                      </td>

                      <td className="discreto">{item.orgao_financiador || '—'}</td>

                      <td>
                        <span className="badge badge--modalidade">
                          {item.modalidade ? MODALIDADES[item.modalidade] || item.modalidade : '—'}
                        </span>
                      </td>

                      <td>
                        {item.prazo_inscricao ? (
                          <span className={`prazo ${item.prazo_urgente ? 'prazo--urgente' : ''}`}>
                            <span className="prazo__data">{formatarData(item.prazo_inscricao)}</span>
                            <span className="prazo__restante">
                              {item.dias_restantes == null
                                ? '—'
                                : item.dias_restantes < 0
                                ? 'Vencido'
                                : item.dias_restantes === 0
                                ? 'Hoje'
                                : `${item.dias_restantes} dias`}
                            </span>
                          </span>
                        ) : (
                          <span className="discreto">—</span>
                        )}
                      </td>

                      <td className="tabela__num mono">{formatarValor(item.valor_maximo_por_projeto)}</td>

                      <td>
                        {eleg ? (
                          <span className={`badge ${classeEleg}`}>
                            {eleg === 'ELEGIVEL'
                              ? '✓ Elegível'
                              : eleg === 'INELEGIVEL'
                              ? '✕ Inelegível'
                              : '? Indeterminado'}
                          </span>
                        ) : (
                          <span className="discreto">—</span>
                        )}
                      </td>

                      <td>
                        <span className={`fit ${classeFit}`}>
                          <span className="fit__nota">{nota ?? '—'}</span>
                          {nota != null && (
                            <span
                              className="fit__barra"
                              style={{ '--fit': nota } as React.CSSProperties}
                            />
                          )}
                        </span>
                      </td>

                      <td>
                        <span className={`status status--${item.status.toLowerCase()}`}>
                          {STATUS_EDITAL[item.status] || item.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Rodapé de Paginação */}
        {dados && dados.total > 0 && (
          <div className="paginacao">
            <span>
              Mostrando {inicioRegistro}–{fimRegistro} de {dados.total} editais
            </span>
            <div className="linha">
              <button
                className="btn btn--sm"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
              >
                ← Anterior
              </button>
              <span className="discreto" style={{ alignSelf: 'center' }}>
                Página {pagina} de {dados.totalPaginas || 1}
              </span>
              <button
                className="btn btn--sm"
                disabled={pagina >= dados.totalPaginas}
                onClick={() => setPagina((p) => Math.min(dados.totalPaginas, p + 1))}
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
