import { Link } from 'react-router'

type Props = {
  id: string
  lista: string[]
  escolhidos: string[] // vazio = todos da lista
  onChange: (escolhidos: string[]) => void
}

// "Todos da lista" ou uma seleção da lista de destinatários.
export function EscolhaDestinatarios({ id, lista, escolhidos, onChange }: Props) {
  // Seleção nunca fica vazia (vazio significaria "todos"), então o modo sai dos próprios dados.
  const escolher = escolhidos.length > 0
  const marcados = new Set(escolhidos.map((e) => e.toLowerCase()))

  // "Escolher" começa com todos marcados.
  function modo(escolherAgora: boolean) {
    if (escolherAgora !== escolher) onChange(escolherAgora ? [...lista] : [])
  }

  function alternar(email: string, marcar: boolean) {
    onChange(marcar ? [...escolhidos, email] : escolhidos.filter((e) => e.toLowerCase() !== email.toLowerCase()))
  }

  return (
    <div className="campo">
      <span className="campo__rotulo" id={id}>Destinatários</span>
      <div className="segmentado" role="radiogroup" aria-labelledby={id}>
        <button type="button" role="radio" aria-checked={!escolher} onClick={() => modo(false)}>
          Todos da lista ({lista.length})
        </button>
        <button type="button" role="radio" aria-checked={escolher} onClick={() => modo(true)} disabled={!lista.length}>
          Escolher
        </button>
      </div>

      {escolher ? (
        <ul className="escolha-destinatarios">
          {lista.map((email) => {
            const marcado = marcados.has(email.toLowerCase())
            return (
              <li key={email}>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={marcado}
                    // O último marcado não pode sair: para todos, use "Todos da lista".
                    disabled={marcado && marcados.size === 1}
                    onChange={(e) => alternar(email, e.target.checked)}
                  />
                  {email}
                </label>
              </li>
            )
          })}
        </ul>
      ) : null}

      <span className="campo__ajuda">
        {lista.length ? '' : 'A lista está vazia: ninguém recebe. '}
        <Link to="/configuracoes/destinatarios">Gerenciar lista ›</Link>
      </span>
    </div>
  )
}
