import { useEffect, useState, type FormEvent } from 'react'
import { auth } from '../../api/auth'
import { mensagemDeErro } from '../../api/cliente'

// Tarefa 4: dados da conta autenticada, separados do perfil empresarial.
export function SecaoConta() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [aviso, setAviso] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    void auth.usuarioLogado().then((u) => { if (u) { setNome(u.nome); setEmail(u.email) } })
      .catch((erro) => setAviso(mensagemDeErro(erro)))
  }, [])

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (novaSenha !== confirmacao) return setAviso('A confirmação da nova senha não confere.')
    setSalvando(true)
    setAviso('')
    try {
      await auth.atualizarConta({ nome, senhaAtual, novaSenha })
      setSenhaAtual(''); setNovaSenha(''); setConfirmacao('')
      setAviso('Dados da conta atualizados com sucesso.')
    } catch (erro) { setAviso(mensagemDeErro(erro)) }
    finally { setSalvando(false) }
  }

  return <form className="card" onSubmit={salvar}>
    <div className="card__corpo pilha">
      <div className="campo"><label htmlFor="conta-nome">Nome</label>
        <input className="input" id="conta-nome" value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} maxLength={100} /></div>
      <div className="campo"><label>E-mail (não editável)</label><input className="input" value={email} readOnly /></div>
      <div className="campo"><label htmlFor="conta-atual">Senha atual (obrigatória)</label>
        <input className="input" id="conta-atual" type="password" autoComplete="current-password" required value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} /></div>
      <div className="campo"><label htmlFor="conta-nova">Nova senha (deixe em branco para manter)</label>
        <input className="input" id="conta-nova" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} /></div>
      <div className="campo"><label htmlFor="conta-confirma">Confirmar nova senha</label>
        <input className="input" id="conta-confirma" type="password" autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} /></div>
      {aviso && <p role="status">{aviso}</p>}
      <button className="btn btn--primario" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar alterações'}</button>
    </div>
  </form>
}
