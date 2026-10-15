import { useState, type KeyboardEvent } from 'react'

type Props = {
  id: string
  valores: string[]
  onChange: (valores: string[]) => void
  // Mensagem de erro para um valor novo, ou null se ele for aceito.
  validar: (valor: string) => string | null
  placeholder: string
  tipo?: 'text' | 'email' | 'number'
  sufixo?: (valor: string) => string
}

// Lista editável em chips: Enter, vírgula ou sair do campo adiciona; × ou Backspace remove.
export function EntradaChips({ id, valores, onChange, validar, placeholder, tipo = 'text', sufixo }: Props) {
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  function adicionar(): boolean {
    const valor = texto.trim().replace(/,$/, '')
    if (!valor) return true
    if (valores.includes(valor)) {
      setTexto('')
      return true
    }
    const problema = validar(valor)
    setErro(problema)
    if (problema) return false
    onChange([...valores, valor])
    setTexto('')
    return true
  }

  function tecla(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      adicionar()
    } else if (e.key === 'Backspace' && !texto && valores.length) {
      onChange(valores.slice(0, -1))
    }
  }

  return (
    <div className="pilha pilha--sm">
      <div className="chips-entrada">
        {valores.map((valor) => (
          <span key={valor} className="etiqueta chips-entrada__chip">
            {valor}
            {sufixo ? ` ${sufixo(valor)}` : ''}
            <button type="button" aria-label={`Remover ${valor}`} onClick={() => onChange(valores.filter((v) => v !== valor))}>
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          type={tipo}
          value={texto}
          placeholder={placeholder}
          aria-invalid={erro ? true : undefined}
          onChange={(e) => {
            setTexto(e.target.value)
            setErro(null)
          }}
          onKeyDown={tecla}
          onBlur={adicionar}
        />
      </div>
      {erro ? <span className="campo__erro">{erro}</span> : null}
    </div>
  )
}
