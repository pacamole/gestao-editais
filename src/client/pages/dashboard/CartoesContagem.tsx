import { Link } from 'react-router'
import type { CartoesDashboard } from '../../../shared/tipos/dashboard'

// Quatro cartões de contagem com navegação para a lista filtrada.
export function CartoesContagem({ cartoes }: { cartoes: CartoesDashboard }) {
  return (
    <div className="grade-4">
      <Link
        to="/editais?novos_semana=1"
        className="contador"
        title="Clique para ver os editais novos nesta semana"
      >
        <span className="contador__rotulo">Novos esta semana</span>
        <span className="contador__valor">{cartoes.novosSemana}</span>
      </Link>

      <Link
        to="/editais?status=ANALISADO,EM_REVISAO"
        className="contador"
        title="Clique para ver os editais aguardando revisão"
      >
        <span className="contador__rotulo">Aguardando revisão</span>
        <span className="contador__valor">{cartoes.aguardandoRevisao}</span>
      </Link>

      <Link
        to="/editais?status=APROVADO"
        className="contador"
        title="Clique para ver os editais aprovados sem inscrição"
      >
        <span className="contador__rotulo">Aprovados sem inscrição</span>
        <span className="contador__valor">{cartoes.aprovadosSemInscricao}</span>
      </Link>

      <Link
        to="/editais?prazo_urgente=1"
        className={`contador ${cartoes.prazoUrgente > 0 ? 'contador--alerta' : ''}`}
        title="Clique para ver os editais com prazo em até 7 dias"
      >
        <span className="contador__rotulo">Prazo em ≤ 7 dias</span>
        <span className="contador__valor">{cartoes.prazoUrgente}</span>
      </Link>
    </div>
  )
}
