import type { FormEvent } from 'react'
import { editais } from '../../api/editais'
import type { PropsFormulario, ValoresUrl } from './tipos'

// Aba 2: colagem do endereço (URL) do edital.
export function FormUrl({ fontes, valores, onAlterar, processando, onErro, processar }: PropsFormulario<ValoresUrl>) {
  function submeter(e: FormEvent) {
    e.preventDefault()
    const url = valores.url.trim()
    if (!url) {
      onErro('Informe o endereço (URL) do edital.')
      return
    }
    if (!/^https?:\/\//i.test(url)) {
      onErro('O endereço deve começar com http:// ou https://.')
      return
    }
    processar({
      mensagemInicial: 'Consultando endereço de origem e obtendo edital...',
      mensagemSucesso: 'Edital criado com sucesso! Redirecionando para o detalhe...',
      erroPadrao: 'Falha ao processar URL.',
      executar: () => editais.criarPorUrl({ url, fonte_id: valores.fonteId }),
    })
  }

  return (
    <form onSubmit={submeter} className="card__corpo">
      <div className="pilha">
        <div className="campo">
          <label htmlFor="fonte-url">Fonte de origem</label>
          <select
            id="fonte-url"
            className="select"
            value={valores.fonteId}
            onChange={(e) => onAlterar({ fonteId: e.target.value })}
            disabled={processando}
          >
            {fontes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome} ({f.tipo})
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="url-edital">Endereço (URL) da publicação ou PDF</label>
          <input
            id="url-edital"
            type="url"
            className="input"
            placeholder="https://finep.gov.br/chamadas_publicas/chamadapublica/edital-2026.pdf"
            value={valores.url}
            onChange={(e) => onAlterar({ url: e.target.value })}
            disabled={processando}
            required
          />
          <span className="campo__ajuda">
            Insira o link oficial do edital. O sistema registrará a oportunidade para análise.
          </span>
        </div>

        <div className="card__rodape linha">
          <button type="submit" className="btn btn--primario" disabled={!valores.url.trim() || processando}>
            {processando ? 'Processando URL...' : 'Processar endereço e avançar →'}
          </button>
        </div>
      </div>
    </form>
  )
}
