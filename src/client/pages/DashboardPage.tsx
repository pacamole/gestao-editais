import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { DashboardResposta } from '../../shared/tipos/dashboard'
import { ErroApi, mensagemDeErro } from '../api/cliente'
import { dashboard } from '../api/dashboard'
import { CartoesContagem } from './dashboard/CartoesContagem'
import { DistribuicaoClassificacao } from './dashboard/DistribuicaoClassificacao'
import { EditaisUrgentes } from './dashboard/EditaisUrgentes'
import { SaudeColeta } from './dashboard/SaudeColeta'
import { TopFit } from './dashboard/TopFit'

export function DashboardPage() {
  const [dados, setDados] = useState<DashboardResposta | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    async function carregarDashboard() {
      try {
        setCarregando(true)
        setErro(null)
        setDados(await dashboard.obter())
      } catch (err) {
        // Resposta de erro do servidor mantém o texto fixo; o resto mostra a causa.
        setErro(
          err instanceof ErroApi
            ? 'Falha ao carregar indicadores do dashboard.'
            : mensagemDeErro(err, 'Erro inesperado ao carregar dados.'),
        )
      } finally {
        setCarregando(false)
      }
    }

    carregarDashboard()
  }, [])

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
          <CartoesContagem cartoes={dados.cartoes} />

          <div className="grade-2">
            <EditaisUrgentes itens={dados.editaisUrgentes} />
            <TopFit itens={dados.topFit} />
          </div>

          <div className="grade-2">
            <DistribuicaoClassificacao distribuicao={dados.distribuicao} />
            <SaudeColeta fontes={dados.saudeColeta} />
          </div>
        </div>
      )}
    </section>
  )
}
