import { useEffect, useState, type FormEvent } from 'react'
import { emailValido, TIPOS_NOTIFICACAO } from '../../../shared/catalogoAlertas'
import type { DestinatarioItem } from '../../../shared/tipos/destinatarios'
import { mensagemDeErro } from '../../api/cliente'
import { destinatarios as api } from '../../api/destinatarios'

type Aviso = { tipo: 'sucesso' | 'atencao' | 'erro'; texto: string } | null

function rotuloUso(alertas: string[]): string {
  if (alertas.length === TIPOS_NOTIFICACAO.length) return 'Em todos os alertas'
  if (!alertas.length) return 'Em nenhum alerta'
  return `Em ${alertas.length === 1 ? '1 alerta' : `${alertas.length} alertas`} (${alertas.join(', ')})`
}

export function SecaoDestinatarios() {
  const [lista, setLista] = useState<DestinatarioItem[] | null>(null)
  const [novo, setNovo] = useState('')
  const [busca, setBusca] = useState('')
  const [aviso, setAviso] = useState<Aviso>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    api
      .listar()
      .then((r) => setLista(r.destinatarios))
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e, 'Não foi possível carregar a lista.') }))
  }, [])

  async function adicionar(evento: FormEvent) {
    evento.preventDefault()
    const email = novo.trim()
    if (!emailValido(email)) {
      setAviso({ tipo: 'erro', texto: 'E-mail inválido.' })
      return
    }
    setOcupado(true)
    setAviso(null)
    try {
      setLista((await api.adicionar(email)).destinatarios)
      setNovo('')
      setAviso({ tipo: 'sucesso', texto: `${email} adicionado.` })
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e, 'Não foi possível adicionar.') })
    } finally {
      setOcupado(false)
    }
  }

  async function remover(item: DestinatarioItem) {
    const uso = item.alertas.length ? `\n\nEle deixa de receber: ${item.alertas.join(', ')}.` : ''
    if (!window.confirm(`Remover ${item.email} da lista?${uso}`)) return
    setOcupado(true)
    setAviso(null)
    try {
      const r = await api.remover(item.email)
      setLista(r.destinatarios)
      setAviso(
        r.alertas_desativados.length
          ? {
              tipo: 'atencao',
              texto: `${item.email} removido. ${r.alertas_desativados.join(', ')} ficou sem destinatários e foi desativado.`,
            }
          : { tipo: 'sucesso', texto: `${item.email} removido.` },
      )
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e, 'Não foi possível remover.') })
    } finally {
      setOcupado(false)
    }
  }

  if (!lista) {
    return aviso ? <p className="aviso aviso--erro" role="alert">{aviso.texto}</p> : <p>Carregando…</p>
  }

  const termo = busca.trim().toLowerCase()
  const visiveis = termo ? lista.filter((d) => d.email.toLowerCase().includes(termo)) : lista

  return (
    <div className="pilha">
      {aviso ? (
        <p className={`aviso aviso--${aviso.tipo}`} role={aviso.tipo === 'erro' ? 'alert' : 'status'}>
          {aviso.texto}
        </p>
      ) : null}

      <div className="card">
        <form className="card__cabecalho destinatarios__adicionar" onSubmit={adicionar}>
          <label htmlFor="novo_destinatario">Adicionar e-mail</label>
          <input
            id="novo_destinatario"
            className="input"
            type="email"
            placeholder="nome@empresa.com"
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
          />
          <button className="btn btn--primario" type="submit" disabled={ocupado || !novo.trim()}>
            Adicionar
          </button>
        </form>

        <div className="card__corpo pilha pilha--sm">
          <div className="linha linha--entre">
            <span className="discreto">{lista.length === 1 ? '1 e-mail' : `${lista.length} e-mails`}</span>
            {lista.length > 5 ? (
              <input
                className="input destinatarios__busca"
                type="search"
                aria-label="Buscar e-mail"
                placeholder="Buscar…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            ) : null}
          </div>

          {visiveis.length ? (
            <ul className="destinatarios">
              {visiveis.map((d) => (
                <li key={d.email} className="destinatarios__item">
                  <span className="destinatarios__email">{d.email}</span>
                  {d.usuario ? <span className="badge">Usuário do sistema</span> : <span />}
                  <span className="discreto">{rotuloUso(d.alertas)}</span>
                  <button
                    type="button"
                    className="btn btn--sm btn--fantasma"
                    aria-label={`Remover ${d.email}`}
                    disabled={ocupado}
                    onClick={() => remover(d)}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="vazio">{lista.length ? 'Nenhum e-mail encontrado.' : 'A lista está vazia: nenhum alerta será enviado.'}</p>
          )}
        </div>
      </div>

      <p className="discreto">Novas contas criadas no sistema entram nesta lista automaticamente.</p>
    </div>
  )
}
