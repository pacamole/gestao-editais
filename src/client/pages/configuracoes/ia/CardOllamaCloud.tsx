import type { FormEvent } from 'react'

export const LINK_OLLAMA = 'https://ollama.com'
export const LINK_CHAVES_OLLAMA = 'https://ollama.com/settings/keys'
const LINK_MODELOS_CLOUD = 'https://ollama.com/search?c=cloud'

type Props = {
  chaveDefinida: boolean
  chave: string
  onChave: (chave: string) => void
  modelo: string
  onModelo: (modelo: string) => void
  modelos: string[] // da última busca; vazio = ainda não buscou
  verificando: boolean
  onBuscarModelos: () => void
  salvando: boolean
  modoPendente: boolean // a IA ainda usa este computador
  onSalvar: () => void
}

// Sugestão inicial quando ainda não há modelo escolhido: um gemma, se houver (família do modelo local).
export function sugerirModelo(modelos: string[]): string {
  return modelos.find((m) => m.startsWith('gemma')) ?? modelos[0] ?? ''
}

export function CardOllamaCloud(p: Props) {
  const opcoes = p.modelos.length ? p.modelos : p.modelo ? [p.modelo] : []
  const podeBuscar = Boolean(p.chave.trim() || p.chaveDefinida)

  return (
    <form
      className="card"
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        p.onSalvar()
      }}
    >
      <div className="card__cabecalho"><h2>Ollama Cloud</h2></div>
      <div className="card__corpo pilha">
        <p className="suave">
          Usa os modelos de IA do Ollama pela internet, sem instalar nada neste computador. Precisa de uma conta no site do
          Ollama; o uso entra na cota da conta.
        </p>

        <details className="ajuda-senha" open={!p.chaveDefinida}>
          <summary>Como conseguir a chave de API</summary>
          <ol>
            <li>
              Crie uma conta (ou entre) em{' '}
              <a href={LINK_OLLAMA} target="_blank" rel="noreferrer">
                ollama.com ↗
              </a>
              .
            </li>
            <li>
              Abra{' '}
              <a href={LINK_CHAVES_OLLAMA} target="_blank" rel="noreferrer">
                Settings › Keys ↗
              </a>{' '}
              e clique em <strong>Add API Key</strong>. Dê um nome, como "Editais I9+".
            </li>
            <li>Copie a chave gerada e cole no campo abaixo. Ela só aparece uma vez no site.</li>
          </ol>
        </details>

        <div className="campo">
          <label htmlFor="ia_chave">Chave de API</label>
          <div className="linha">
            <input
              id="ia_chave"
              className="input campo-flex"
              type="password"
              autoComplete="new-password"
              placeholder={p.chaveDefinida ? '•••••••• (mantida se vazio)' : 'Cole aqui a chave gerada em ollama.com'}
              value={p.chave}
              onChange={(e) => p.onChave(e.target.value)}
            />
            <button type="button" className="btn" disabled={!podeBuscar || p.verificando} onClick={p.onBuscarModelos}>
              {p.verificando ? 'Conferindo…' : 'Conferir chave'}
            </button>
          </div>
          <span className="campo__ajuda">Fica guardada no servidor do sistema e nunca volta para a tela.</span>
        </div>

        <div className="campo">
          <label htmlFor="ia_modelo">Modelo</label>
          <select
            id="ia_modelo"
            className="select"
            value={p.modelo}
            disabled={!opcoes.length}
            onChange={(e) => p.onModelo(e.target.value)}
          >
            {!p.modelo ? <option value="">{opcoes.length ? 'Escolha um modelo' : 'Confira a chave para ver os modelos'}</option> : null}
            {opcoes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <span className="campo__ajuda">
            Modelos maiores respondem melhor, mas são mais lentos e gastam mais da cota.{' '}
            <a href={LINK_MODELOS_CLOUD} target="_blank" rel="noreferrer">
              Ver os modelos no site ↗
            </a>
          </span>
        </div>
      </div>
      <div className="card__rodape">
        <button className="btn btn--primario" type="submit" disabled={p.salvando || !p.modelo || !podeBuscar}>
          {p.salvando ? 'Salvando…' : p.modoPendente ? 'Salvar e usar o Ollama Cloud' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}
