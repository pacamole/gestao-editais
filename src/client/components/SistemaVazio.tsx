import { Link } from 'react-router'

// Primeiro uso: ainda não há nenhum edital. Explica as duas formas de trazer editais para o sistema.
export function SistemaVazio() {
  return (
    <div className="card">
      <div className="card__corpo pilha">
        <h2>Nenhum edital ainda</h2>
        <p>O sistema trabalha só com os editais que você trouxer, de duas formas:</p>
        <ul>
          <li>
            <strong>Enviar um edital agora:</strong> o PDF, o link da chamada ou os dados digitados, em Nova entrada.
          </li>
          <li>
            <strong>Monitorar um órgão:</strong> cadastre a página onde ele publica os editais e o sistema busca as
            chamadas abertas todo dia.
          </li>
        </ul>
        <p className="discreto">Em ambos os casos a IA lê o edital e avalia se ele serve para a empresa.</p>
        <div className="linha">
          <Link to="/editais/novo" className="btn btn--primario">Enviar edital</Link>
          <Link to="/configuracoes/fontes" className="btn">Monitorar um órgão</Link>
        </div>
      </div>
    </div>
  )
}
