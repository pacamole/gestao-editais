import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { auth } from '../api/auth'

const linksOperacao = [
  { to: '/', rotulo: 'Dashboard', end: true },
  { to: '/editais', rotulo: 'Editais', end: true },
  { to: '/editais/novo', rotulo: 'Nova entrada', end: true },
]

const linksGestor = [
  { to: '/perfil', rotulo: 'Perfil da empresa' },
  { to: '/criterios', rotulo: 'Critérios e pesos' },
  { to: '/fontes', rotulo: 'Fontes monitoradas' },
  { to: '/alertas', rotulo: 'Alertas' },
  { to: '/base', rotulo: 'Base de dados' },
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
        <div>
          <p className="app-menu__rotulo">Gestão</p>
          <ul className="app-menu__grupo">
            {linksGestor.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to}>{link.rotulo}</NavLink>
              </li>
            ))}
          </ul>
        </div>
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
