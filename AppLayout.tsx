import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'

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
  const [autenticado, setAutenticado] = useState(false)
  useEffect(() => {
    fetch('/api/auth/me').then((r) => { if (r.ok) setAutenticado(true); else navigate('/login') }).catch(() => navigate('/login'))
  }, [navigate])
  if (!autenticado) return <main className="app-conteudo"><p>Verificando sessão...</p></main>
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
      </nav>
      <main className="app-conteudo">
        <Outlet />
      </main>
    </div>
  )
}
