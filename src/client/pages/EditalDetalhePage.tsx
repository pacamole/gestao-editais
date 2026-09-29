import { useParams } from 'react-router'

export function EditalDetalhePage() {
  const { id } = useParams()
  return (
    <section>
      <header className="pagina-cabecalho">
        <div>
          <h1>Detalhe do edital</h1>
          <p>P04 — Análise completa e revisão.</p>
        </div>
      </header>
      <p>Edital: {id}</p>
    </section>
  )
}
