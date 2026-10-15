import { NavLink, Outlet, useLocation } from 'react-router'

type Secao = { to: string; rotulo: string; descricao: string }

// Seções da página de configurações, agrupadas no menu lateral.
export const gruposConfiguracoes: { grupo: string; secoes: Secao[] }[] = [
  {
    grupo: 'Empresa',
    secoes: [
      { to: 'perfil', rotulo: 'Perfil da empresa', descricao: 'Dados estratégicos usados para comparação com os editais ativos.' },
      { to: 'criterios', rotulo: 'Critérios e pesos', descricao: 'Configuração do filtro dinâmico e simulação com edital analisado.' },
    ],
  },
  {
    grupo: 'Coleta',
    secoes: [{ to: 'fontes', rotulo: 'Fontes monitoradas', descricao: 'Gerenciamento dos portais e da coleta periódica.' }],
  },
  {
    grupo: 'Notificações',
    secoes: [
      { to: 'alertas', rotulo: 'Alertas', descricao: 'Quando cada alerta dispara e quem recebe.' },
      { to: 'destinatarios', rotulo: 'Destinatários', descricao: 'E-mails que podem receber alertas. Cada alerta escolhe quem desta lista recebe.' },
      { to: 'email', rotulo: 'E-mail (SMTP)', descricao: 'Servidor usado para enviar os alertas por e-mail.' },
    ],
  },
  {
    grupo: 'Sistema',
    secoes: [
      { to: 'ia', rotulo: 'Inteligência artificial', descricao: 'Servidor Ollama usado na extração de dados e no chat.' },
      { to: 'base', rotulo: 'Base de dados', descricao: 'Leve a base inteira de um computador para outro: exporte aqui e importe lá.' },
    ],
  },
]

const secoes = gruposConfiguracoes.flatMap((g) => g.secoes)

export function ConfiguracoesLayout() {
  const { pathname } = useLocation()
  const atual = secoes.find((s) => pathname.startsWith(`/configuracoes/${s.to}`))

  return (
    <section>
      <header className="pagina-cabecalho">
        <div>
          <h1>Configurações</h1>
          <p>Empresa, avaliação, coleta, notificações e sistema em um só lugar.</p>
        </div>
      </header>

      <div className="config">
        <nav className="config__menu" aria-label="Seções de configuração">
          {gruposConfiguracoes.map((g) => (
            <div key={g.grupo} className="config__grupo">
              <p className="config__rotulo">{g.grupo}</p>
              <ul>
                {g.secoes.map((s) => (
                  <li key={s.to}>
                    <NavLink to={s.to}>{s.rotulo}</NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="config__painel">
          {atual ? (
            <header className="config__cabecalho">
              <h2>{atual.rotulo}</h2>
              <p>{atual.descricao}</p>
            </header>
          ) : null}
          <Outlet />
        </div>
      </div>
    </section>
  )
}
