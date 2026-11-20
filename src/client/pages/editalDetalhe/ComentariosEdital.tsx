import { useCallback, useEffect, useState } from 'react'
import { requisicao, mensagemDeErro } from '../../api/cliente'
import { auth } from '../../api/auth'

type Tipo = 'GERAL' | 'APROVACAO' | 'REPROVACAO'
type Comentario = { id: string; usuario_id: string; autor: string; autor_email: string; tipo: Tipo; texto: string; criado_em: string }
const rotulos: Record<Tipo, string> = { GERAL: 'Comentário', APROVACAO: 'Motivo da aprovação', REPROVACAO: 'Motivo da reprovação' }

// Tarefa 7: observações independentes das ações auditáveis de revisão.
export function ComentariosEdital({ id }: { id: string }) {
  const [lista, setLista] = useState<Comentario[]>([])
  const [tipo, setTipo] = useState<Tipo>('GERAL')
  const [texto, setTexto] = useState('')
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const base = `/api/editais/${encodeURIComponent(id)}/comentarios`
  const carregar = useCallback(async () => {
    try { setLista(await requisicao<Comentario[]>(base)) }
    catch (e) { setErro(mensagemDeErro(e)) }
  }, [base])
  useEffect(() => { void carregar(); void auth.usuarioLogado().then((u) => setEmail(u?.email ?? '')) }, [carregar])

  async function adicionar() {
    if (!texto.trim()) return setErro('Escreva um comentário antes de salvar.')
    setSalvando(true); setErro('')
    try {
      await requisicao(base, { metodo: 'POST', corpo: { tipo, texto } })
      setTexto(''); await carregar()
    } catch (e) { setErro(mensagemDeErro(e)) }
    finally { setSalvando(false) }
  }

  async function excluir(item: Comentario) {
    if (!window.confirm('Excluir permanentemente este comentário?')) return
    setErro('')
    try { await requisicao(`${base}/${encodeURIComponent(item.id)}`, { metodo: 'DELETE' }); await carregar() }
    catch (e) { setErro(mensagemDeErro(e)) }
  }

  return <div className="card detalhe-bloco">
    <div className="card__cabecalho"><h2>Comentários do edital</h2></div>
    <div className="card__corpo pilha">
      <div className="campo"><label htmlFor="tipo-comentario">Tipo de comentário</label>
        <select className="input" id="tipo-comentario" value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
          {Object.entries(rotulos).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}
        </select></div>
      <div className="campo"><label htmlFor="texto-comentario">Texto</label>
        <textarea className="textarea" id="texto-comentario" rows={3} maxLength={3000} value={texto} onChange={(e) => setTexto(e.target.value)} /></div>
      <button type="button" className="btn btn--primario" disabled={salvando} onClick={() => void adicionar()}>{salvando ? 'Salvando...' : 'Adicionar comentário'}</button>
      {erro && <p className="aviso aviso--erro" role="alert">{erro}</p>}
      <h3>Comentários registrados</h3>
      {lista.length === 0 && <p className="discreto">Nenhum comentário registrado.</p>}
      {lista.map((c) => <div className="linha-tempo__item" key={c.id}>
        <strong>{rotulos[c.tipo]}</strong> · {c.autor} · <span className="discreto">{new Date(c.criado_em).toLocaleString('pt-BR')}</span>
        <p style={{ whiteSpace: 'pre-wrap' }}>{c.texto}</p>
        {email === c.autor_email && <button type="button" className="btn btn--sm" onClick={() => void excluir(c)}>Excluir meu comentário</button>}
      </div>)}
    </div>
  </div>
}
