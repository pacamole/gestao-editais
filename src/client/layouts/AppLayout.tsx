import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { auth } from '../api/auth'

const linksOperacao = [
  { to: '/', rotulo: 'Dashboard', end: true },
  { to: '/editais', rotulo: 'Editais', end: true },
  { to: '/editais/novo', rotulo: 'Nova entrada', end: true },
]

export function AppLayout() {
  const navigate = useNavigate()

  // Encerra a sessão do usuário.
  async function sairDaConta() {
    try {
      await auth.sair()
      navigate('/login', { replace: true })
    } catch (erro) {
      alert('Erro ao sair da conta. Tente novamente.')
    }
  }

  return (
    <div className="app">
      <nav className="app-menu" aria-label="Menu principal">
        <Link to="/" className="app-menu__marca">
          Editais <small>I9+</small>
        </Link>
        <ul className="app-menu__grupo">
          {linksOperacao.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} end={link.end}>
                {link.rotulo}
              </NavLink>
            </li>
          ))}
        </ul>
        <ul className="app-menu__grupo">
          <li>
            <NavLink to="/configuracoes">Configurações</NavLink>
          </li>
        </ul>
           {/* Botão para encerrar a sessão */}
        <button
          type="button"
          onClick={sairDaConta}
          className="app-menu__sair"
        >
          Sair da conta
        </button>
      </nav>
      <main className="app-conteudo">
        <Outlet />
      </main>
    </div>
  )
}
