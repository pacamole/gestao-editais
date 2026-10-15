import { createBrowserRouter, Navigate } from 'react-router'
import { RotaProtegida } from './components/RotaProtegida'
import { SecaoAlertas } from './pages/configuracoes/alertas/SecaoAlertas'
import { ConfiguracoesLayout } from './pages/configuracoes/ConfiguracoesLayout'
import { SecaoBase } from './pages/configuracoes/SecaoBase'
import { SecaoCriterios } from './pages/configuracoes/SecaoCriterios'
import { SecaoDestinatarios } from './pages/configuracoes/SecaoDestinatarios'
import { SecaoEmail } from './pages/configuracoes/SecaoEmail'
import { SecaoFontes } from './pages/configuracoes/SecaoFontes'
import { SecaoIa } from './pages/configuracoes/SecaoIa'
import { SecaoPerfil } from './pages/configuracoes/SecaoPerfil'
import { DashboardPage } from './pages/DashboardPage'
import { EditalDetalhePage } from './pages/EditalDetalhePage'
import { EditaisPage } from './pages/EditaisPage'
import { ErroPage } from './pages/ErroPage'
import { LoginPage } from './pages/LoginPage'
import { NovaEntradaPage } from './pages/NovaEntradaPage'

// Mapa de páginas (§5 da especificação).
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> }, // P01 — público
  {
    element: <RotaProtegida />,
    errorElement: <ErroPage />,
    children: [
      // Operação
      { index: true, element: <DashboardPage /> }, // P02
      { path: 'editais', element: <EditaisPage /> }, // P03
      { path: 'editais/novo', element: <NovaEntradaPage /> }, // P05
      { path: 'editais/:id', element: <EditalDetalhePage /> }, // P04
      // Configurações: uma página, com menu de seções.
      {
        path: 'configuracoes',
        element: <ConfiguracoesLayout />,
        children: [
          { index: true, element: <Navigate to="perfil" replace /> },
          { path: 'perfil', element: <SecaoPerfil /> }, // P06
          { path: 'criterios', element: <SecaoCriterios /> }, // P07
          { path: 'fontes', element: <SecaoFontes /> }, // P08
          { path: 'alertas', element: <SecaoAlertas /> }, // P09
          { path: 'destinatarios', element: <SecaoDestinatarios /> },
          { path: 'email', element: <SecaoEmail /> },
          { path: 'ia', element: <SecaoIa /> },
          { path: 'base', element: <SecaoBase /> }, // compartilhamento da base
        ],
      },
      // Endereços antigos (links salvos e e-mails já enviados).
      ...['perfil', 'criterios', 'fontes', 'alertas', 'base'].map((secao) => ({
        path: secao,
        element: <Navigate to={`/configuracoes/${secao}`} replace />,
      })),
      { path: '*', element: <ErroPage /> },
    ],
  },
])
