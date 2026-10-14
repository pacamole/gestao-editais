import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import type { FiltrosEditais as Filtros, ListaEditaisResposta } from '../../shared/tipos/editais'
import type { FonteComExecucoes } from '../../shared/tipos/fontes'
import { ErroApi, mensagemDeErro } from '../api/cliente'
import { editais } from '../api/editais'
import { fontes as apiFontes } from '../api/fontes'
import { AcoesLote } from './editais/AcoesLote'
import { FiltrosEditais } from './editais/FiltrosEditais'
import { aplicarFiltros, FILTROS_PADRAO, filtrosAlteradosPelaUrl, filtrosDaUrl } from './editais/filtrosUrl'
import { Paginacao } from './editais/Paginacao'
import { TabelaEditais } from './editais/TabelaEditais'

const LIMITE = 10

export function EditaisPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Filtros derivados da URL ou padrão
  const [filtros, setFiltros] = useState<Filtros>(() => filtrosDaUrl(searchParams))
  const [pagina, setPagina] = useState(Number(searchParams.get('pagina') ?? 1))

  const [dados, setDados] = useState<ListaEditaisResposta | null>(null)
  const [fontes, setFontes] = useState<FonteComExecucoes[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  // Seleção de linhas para ações em lote
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [executandoLote, setExecutandoLote] = useState(false)

  // Lista de fontes para o filtro (falha silenciosa: o filtro fica só com "Todas")
  useEffect(() => {
    apiFontes
      .listar()
      .then((r) => setFontes(r.fontes || []))
      .catch(() => {})
  }, [])

  // Atualiza filtros quando a URL muda (ex: navegação vinda do dashboard)
  useEffect(() => {
    setFiltros((atual) => aplicarFiltros(atual, filtrosAlteradosPelaUrl(searchParams)))
  }, [searchParams])

  const carregarEditais = useCallback(async () => {
    try {
      setCarregando(true)
      setErro(null)
      setDados(await editais.listar(filtros, pagina, LIMITE))
      // Limpa seleções que não estão mais na página
      setSelecionados([])
    } catch (err) {
      setErro(err instanceof ErroApi ? 'Não foi possível carregar os editais.' : mensagemDeErro(err, 'Erro ao carregar dados.'))
    } finally {
      setCarregando(false)
    }
  }, [filtros, pagina])

  // Recarrega sempre que um filtro ou a página muda
  useEffect(() => {
    carregarEditais()
  }, [carregarEditais])

  function alterarFiltros(parcial: Partial<Filtros>) {
    setFiltros((atual) => aplicarFiltros(atual, parcial))
    setPagina(1)
  }

  function limparFiltros() {
    setFiltros((atual) => aplicarFiltros(atual, FILTROS_PADRAO))
    setPagina(1)
    setSearchParams({})
  }

  function avisarSucesso(mensagem: string) {
    setSucesso(mensagem)
    setTimeout(() => setSucesso(null), 4000)
  }

  function alternarTodos() {
    if (!dados?.itens) return
    setSelecionados(selecionados.length === dados.itens.length ? [] : dados.itens.map((i) => i.id))
  }

  function alternarItem(id: string) {
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function aprovarLote() {
    if (!selecionados.length || executandoLote) return
    try {
      setExecutandoLote(true)
      setErro(null)
      await editais.lote({ ids: selecionados, acao: 'APROVAR' })
      avisarSucesso(`${selecionados.length} edital(is) aprovado(s) com sucesso.`)
      await carregarEditais()
    } catch (err) {
      setErro(mensagemDeErro(err, 'Erro ao aprovar editais em lote.'))
    } finally {
      setExecutandoLote(false)
    }
  }

  // Descarte exige justificativa; devolve true quando concluído.
  async function descartarLote(justificativa: string): Promise<boolean> {
    if (!justificativa.trim()) {
      setErro('Informe uma justificativa para o descarte em lote.')
      return false
    }
    try {
      setExecutandoLote(true)
      setErro(null)
      await editais.lote({ ids: selecionados, acao: 'DESCARTAR', comentario: justificativa.trim() })
      avisarSucesso(`${selecionados.length} edital(is) descartado(s) com sucesso.`)
      await carregarEditais()
      return true
    } catch (err) {
      setErro(mensagemDeErro(err, 'Erro ao descartar editais em lote.'))
      return false
    } finally {
      setExecutandoLote(false)
    }
  }

  // Exportação CSV da visão filtrada
  function exportarCsv() {
    window.open(editais.urlCsv(filtros), '_blank')
  }

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

      <div className="card" style={{ marginBottom: 'var(--esp-4)' }}>
        <FiltrosEditais filtros={filtros} fontes={fontes} onAlterar={alterarFiltros} onLimpar={limparFiltros} />

        <AcoesLote
          selecionados={selecionados.length}
          executando={executandoLote}
          onAprovar={aprovarLote}
          onDescartar={descartarLote}
          onCancelarSelecao={() => setSelecionados([])}
        />

        <TabelaEditais
          itens={dados?.itens ?? null}
          carregando={carregando}
          selecionados={selecionados}
          onAlternarTodos={alternarTodos}
          onAlternarItem={alternarItem}
        />

        {dados && dados.total > 0 && (
          <Paginacao
            pagina={pagina}
            limite={LIMITE}
            total={dados.total}
            totalPaginas={dados.totalPaginas}
            onIrPara={setPagina}
          />
        )}
      </div>
    </section>
  )
}
