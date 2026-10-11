import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

// Tarefa 9 — autenticação real contra a base local, sem senha fixa no navegador.
export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setErro(''); setCarregando(true)
    try {
      const resposta = await fetch('/api/bhrendon/login', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email, senha}) })
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível entrar.')
      navigate('/', {replace: true})
    } catch (e) { setErro(e instanceof Error ? e.message : 'Erro de conexão.') }
    finally { setCarregando(false) }
  }
  return <section style={{maxWidth:440,margin:'8vh auto',padding:24}}>
    <h1>Gestão de Editais — I9+</h1><p>Entre com as credenciais cadastradas na base local.</p>
    <form onSubmit={entrar} style={{display:'grid',gap:14}}>
      <label>E-mail<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} style={{display:'block',width:'100%'}} /></label>
      <label>Senha<input type="password" required autoComplete="current-password" value={senha} onChange={e=>setSenha(e.target.value)} style={{display:'block',width:'100%'}} /></label>
      {erro && <p role="alert" style={{color:'crimson'}}>{erro}</p>}
      <button type="submit" disabled={carregando}>{carregando?'Entrando...':'Entrar'}</button>
    </form>
  </section>
}
