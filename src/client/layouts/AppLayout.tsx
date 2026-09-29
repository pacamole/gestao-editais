import { Link, NavLink, Outlet } from 'react-router'

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
