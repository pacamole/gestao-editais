import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router'

// Tarefa 9 — tela de login funcional, com validação e mensagens de erro.
export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(evento: FormEvent) {
    evento.preventDefault()
    setErro('')
    if (!email.trim() || !senha) return setErro('Preencha o e-mail e a senha.')
    setCarregando(true)
    try {
      const resposta = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha }) })
      const dados = await resposta.json()
      if (!resposta.ok) return setErro(dados.erro ?? 'Não foi possível entrar.')
      navigate('/')
    } catch {
      setErro('Não foi possível conectar ao servidor.')
    } finally { setCarregando(false) }
  }

  return (
    <main className="login-pagina">
      <form className="login-card" onSubmit={entrar}>
        <div className="login-marca">Editais <small>I9+</small></div>
        <div><h1>Entrar</h1><p>Acesse a plataforma de gestão e análise de editais.</p></div>
        <div className="campo"><label htmlFor="email">E-mail</label><input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" /></div>
        <div className="campo"><label htmlFor="senha">Senha</label><input id="senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Digite sua senha" /></div>
        {erro && <div className="mensagem-erro" role="alert">{erro}</div>}
        <button className="btn btn--primario" type="submit" disabled={carregando}>{carregando ? 'Entrando...' : 'Entrar'}</button>
        <p className="login-ajuda">Não há cadastro público. Os usuários são definidos pelo gestor.</p>
      </form>
    </main>
  )
}
